const MAX_FILE_BYTES = 2 * 1024 * 1024;

const ALLOWED_ARTIFACTS = new Set([
  'brand_repository',
  'sku_library',
  'retailer_model',
  'sources',
  'coverage_gaps',
  'summary',
]);

const ALLOWED_FILE_EXTENSIONS = new Set(['.json', '.csv', '.tsv', '.xlsx', '.xls', '.txt']);
const SNAPSHOT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extension(filename) {
  const match = /(?:\.[^.\\/]+)$/.exec(filename.toLowerCase());
  return match?.[0] || '';
}

function error(field, code, message) {
  return { field, code, message };
}

export function validateSubmissionPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      status: 'ERROR',
      classification: 'SUBMISSION_INVALID',
      errors: [error('body', 'BODY_INVALID', 'Request body must be a JSON object.')],
    };
  }

  if (text(payload.company_website)) {
    errors.push(error('company_website', 'AUTOMATION_REJECTED', 'Submission could not be accepted.'));
  }

  const submissionType = text(payload.submission_type);
  if (!['file_upload', 'change_request'].includes(submissionType)) {
    errors.push(error('submission_type', 'TYPE_INVALID', 'Choose a file upload or change request.'));
  }

  const targetArtifact = text(payload.target_artifact);
  if (!ALLOWED_ARTIFACTS.has(targetArtifact)) {
    errors.push(error('target_artifact', 'ARTIFACT_INVALID', 'Choose a supported canonical artifact.'));
  }

  const sourceSnapshotId = text(payload.source_snapshot_id);
  if (!SNAPSHOT_ID_PATTERN.test(sourceSnapshotId)) {
    errors.push(error('source_snapshot_id', 'SNAPSHOT_INVALID', 'A valid source snapshot ID is required.'));
  }

  const summary = text(payload.summary);
  if (summary.length < 5 || summary.length > 180) {
    errors.push(error('summary', 'SUMMARY_INVALID', 'Summary must be between 5 and 180 characters.'));
  }

  const details = text(payload.details);
  if (details.length < 10 || details.length > 5000) {
    errors.push(error('details', 'DETAILS_INVALID', 'Details must be between 10 and 5,000 characters.'));
  }

  const recordReference = text(payload.record_reference);
  if (recordReference.length > 500) {
    errors.push(error('record_reference', 'REFERENCE_TOO_LONG', 'Record reference must not exceed 500 characters.'));
  }

  const submitterName = text(payload.submitter_name);
  if (submitterName.length > 120) {
    errors.push(error('submitter_name', 'NAME_TOO_LONG', 'Name must not exceed 120 characters.'));
  }

  const submitterEmail = text(payload.submitter_email).toLowerCase();
  if (submitterEmail && (submitterEmail.length > 254 || !EMAIL_PATTERN.test(submitterEmail))) {
    errors.push(error('submitter_email', 'EMAIL_INVALID', 'Enter a valid email address or leave it blank.'));
  }

  let file = null;
  if (submissionType === 'file_upload') {
    const inputFile = payload.file;
    if (!inputFile || typeof inputFile !== 'object' || Array.isArray(inputFile)) {
      errors.push(error('file', 'FILE_REQUIRED', 'Choose a file to upload.'));
    } else {
      const name = text(inputFile.name).replace(/[\u0000-\u001f\u007f]/g, '');
      const mediaType = text(inputFile.type) || 'application/octet-stream';
      const base64 = typeof inputFile.base64 === 'string' ? inputFile.base64 : '';
      const ext = extension(name);

      if (!name || name.length > 180 || name.includes('/') || name.includes('\\')) {
        errors.push(error('file.name', 'FILENAME_INVALID', 'Filename must be a simple name of at most 180 characters.'));
      }
      if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
        errors.push(error('file.name', 'FILE_TYPE_INVALID', 'Supported files are JSON, CSV, TSV, XLSX, XLS, and TXT.'));
      }
      if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
        errors.push(error('file.base64', 'FILE_ENCODING_INVALID', 'File content must be valid base64.'));
      } else {
        const bytes = Buffer.from(base64, 'base64');
        if (bytes.length === 0) {
          errors.push(error('file', 'FILE_EMPTY', 'The uploaded file is empty.'));
        } else if (bytes.length > MAX_FILE_BYTES) {
          errors.push(error('file', 'FILE_TOO_LARGE', `Files must not exceed ${MAX_FILE_BYTES} bytes.`));
        } else {
          if (ext === '.json') {
            try {
              JSON.parse(bytes.toString('utf8'));
            } catch {
              errors.push(error('file', 'JSON_MALFORMED', 'The uploaded JSON file is malformed.'));
            }
          }
          file = { name, mediaType, extension: ext, bytes };
        }
      }
    }
  } else if (payload.file) {
    errors.push(error('file', 'FILE_NOT_ALLOWED', 'Change requests must not include a file payload.'));
  }

  if (errors.length) {
    return { status: 'ERROR', classification: 'SUBMISSION_INVALID', errors };
  }

  return {
    status: 'PASS',
    value: {
      submissionType,
      targetArtifact,
      sourceSnapshotId,
      recordReference,
      summary,
      details,
      submitterName,
      submitterEmail,
      file,
    },
  };
}

export { ALLOWED_ARTIFACTS, ALLOWED_FILE_EXTENSIONS, MAX_FILE_BYTES };
