import { attachDatabasePool } from '@neon/functions';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { validateSubmissionPayload } from '../workflow/submission-contract.mjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

const MAX_REQUEST_BYTES = 3 * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = 8;
const VERCEL_ORIGIN = /^https:\/\/cpg-evidence-atlas(?:-[a-z0-9]+)?(?:-connected-flow-agents)?\.vercel\.app$/;

function originAllowed(origin) {
  if (!origin) return false;
  if (VERCEL_ORIGIN.test(origin)) return true;
  return /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function json(origin, body, status = 200) {
  return Response.json(body, { status, headers: cors(origin) });
}

function fingerprint(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256')
    .update(`${process.env.RATE_LIMIT_SALT}:${address}`)
    .digest('hex');
}

function receiptHash(receipt) {
  return createHash('sha256').update(receipt).digest('hex');
}

async function createSubmission(request, origin) {
  if (!process.env.RATE_LIMIT_SALT) {
    return json(origin, { status: 'ERROR', classification: 'PERSISTENCE_UNAVAILABLE' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json(origin, { status: 'ERROR', classification: 'CONTENT_TYPE_INVALID' }, 415);
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return json(origin, { status: 'ERROR', classification: 'REQUEST_TOO_LARGE' }, 413);
  }

  const bodyText = await request.text();
  if (Buffer.byteLength(bodyText, 'utf8') > MAX_REQUEST_BYTES) {
    return json(origin, { status: 'ERROR', classification: 'REQUEST_TOO_LARGE' }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return json(origin, { status: 'ERROR', classification: 'MALFORMED_JSON' }, 400);
  }

  const validation = validateSubmissionPayload(payload);
  if (validation.status !== 'PASS') return json(origin, validation, 400);

  const value = validation.value;
  const requestFingerprint = fingerprint(request);
  const recent = await pool.query(
    `SELECT count(*)::int AS count
       FROM contribution_submissions
      WHERE request_fingerprint = $1
        AND created_at > now() - interval '1 hour'`,
    [requestFingerprint],
  );
  if (recent.rows[0].count >= RATE_LIMIT_PER_HOUR) {
    return json(origin, { status: 'ERROR', classification: 'RATE_LIMITED' }, 429);
  }

  const id = randomUUID();
  const receipt = randomBytes(24).toString('base64url');
  const fileHash = value.file
    ? createHash('sha256').update(value.file.bytes).digest('hex')
    : null;

  const result = await pool.query(
    `INSERT INTO contribution_submissions (
       id, receipt_hash, submission_type, target_artifact, source_snapshot_id,
       record_reference, summary, details, submitter_name, submitter_email,
       original_filename, media_type, size_bytes, sha256, file_bytes,
       request_fingerprint
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''),
       $11, $12, $13, $14, $15,
       $16
     )
     RETURNING id, submission_type, target_artifact, source_snapshot_id,
               summary, status, created_at, original_filename, size_bytes, sha256`,
    [
      id,
      receiptHash(receipt),
      value.submissionType,
      value.targetArtifact,
      value.sourceSnapshotId,
      value.recordReference || null,
      value.summary,
      value.details,
      value.submitterName,
      value.submitterEmail,
      value.file?.name || null,
      value.file?.mediaType || null,
      value.file?.bytes.length || null,
      fileHash,
      value.file?.bytes || null,
      requestFingerprint,
    ],
  );

  return json(origin, { status: 'ACCEPTED', receipt, submission: result.rows[0] }, 201);
}

async function getSubmission(request, origin) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const receipt = url.searchParams.get('receipt') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || receipt.length < 20) {
    return json(origin, { status: 'ERROR', classification: 'RECEIPT_INVALID' }, 400);
  }

  const result = await pool.query(
    `SELECT id, submission_type, target_artifact, source_snapshot_id,
            summary, status, created_at, updated_at, original_filename,
            size_bytes, sha256, reviewer_notes
       FROM contribution_submissions
      WHERE id = $1 AND receipt_hash = $2`,
    [id, receiptHash(receipt)],
  );
  if (!result.rowCount) return json(origin, { status: 'ERROR', classification: 'NOT_FOUND' }, 404);
  return json(origin, { status: 'PASS', submission: result.rows[0] });
}

export default {
  async fetch(request) {
    const requestId = randomUUID();
    const origin = request.headers.get('origin') || '';
    if (!originAllowed(origin)) {
      return Response.json({ status: 'ERROR', classification: 'ORIGIN_REJECTED' }, { status: 403 });
    }

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname.endsWith('/health'))) {
        await pool.query('SELECT 1');
        return json(origin, { status: 'PASS', service: 'cpg-evidence-atlas-submissions' });
      }
      if (request.method === 'POST' && (url.pathname === '/' || url.pathname.endsWith('/submissions'))) {
        return await createSubmission(request, origin);
      }
      if (request.method === 'GET' && url.pathname.endsWith('/submissions')) {
        return await getSubmission(request, origin);
      }
      return json(origin, { status: 'ERROR', classification: 'NOT_FOUND' }, 404);
    } catch (error) {
      console.error('submission request failed', { requestId, message: error instanceof Error ? error.message : String(error) });
      return json(origin, { status: 'ERROR', classification: 'PERSISTENCE_ERROR', request_id: requestId }, 500);
    }
  },
};
