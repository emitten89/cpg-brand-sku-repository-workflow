import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_FILE_BYTES, validateSubmissionPayload } from '../submission-contract.mjs';

const base = {
  submission_type: 'change_request',
  target_artifact: 'sku_library',
  source_snapshot_id: 'colgate-palmolive-ca-usa-20260831t224158510z',
  record_reference: '35000-941-69',
  summary: 'Correct the pack-size evidence',
  details: 'The package contains two tubes according to the attached source.',
  submitter_name: 'Data steward',
  submitter_email: 'steward@example.com',
};

test('accepts a bounded change request without a file', () => {
  const result = validateSubmissionPayload(base);
  assert.equal(result.status, 'PASS');
  assert.equal(result.value.submissionType, 'change_request');
  assert.equal(result.value.file, null);
});

test('accepts a valid JSON contribution and decodes its bytes', () => {
  const fileText = JSON.stringify({ records: [{ product_sku: '35000-941-69' }] });
  const result = validateSubmissionPayload({
    ...base,
    submission_type: 'file_upload',
    details: 'Additional SKU evidence exported from an approved source.',
    file: {
      name: 'sku-additions.json',
      type: 'application/json',
      base64: Buffer.from(fileText).toString('base64'),
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.value.file.bytes.toString('utf8'), fileText);
});

test('rejects malformed JSON uploads', () => {
  const result = validateSubmissionPayload({
    ...base,
    submission_type: 'file_upload',
    file: {
      name: 'broken.json',
      type: 'application/json',
      base64: Buffer.from('{broken').toString('base64'),
    },
  });
  assert.equal(result.status, 'ERROR');
  assert.ok(result.errors.some(({ code }) => code === 'JSON_MALFORMED'));
});

test('rejects unsupported artifacts and file types', () => {
  const result = validateSubmissionPayload({
    ...base,
    submission_type: 'file_upload',
    target_artifact: 'invented_repository',
    file: {
      name: 'payload.exe',
      type: 'application/octet-stream',
      base64: Buffer.from('not executable').toString('base64'),
    },
  });
  assert.equal(result.status, 'ERROR');
  assert.ok(result.errors.some(({ code }) => code === 'ARTIFACT_INVALID'));
  assert.ok(result.errors.some(({ code }) => code === 'FILE_TYPE_INVALID'));
});

test('rejects oversized uploads and automation honeypot traffic', () => {
  const result = validateSubmissionPayload({
    ...base,
    submission_type: 'file_upload',
    company_website: 'https://spam.invalid',
    file: {
      name: 'too-large.csv',
      type: 'text/csv',
      base64: Buffer.alloc(MAX_FILE_BYTES + 1, 65).toString('base64'),
    },
  });
  assert.equal(result.status, 'ERROR');
  assert.ok(result.errors.some(({ code }) => code === 'FILE_TOO_LARGE'));
  assert.ok(result.errors.some(({ code }) => code === 'AUTOMATION_REJECTED'));
});
