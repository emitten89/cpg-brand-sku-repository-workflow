import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCanonicalSnapshot } from './canonical-contract.mjs';
import { MAX_FILE_BYTES } from './submission-contract.mjs';

const workflowDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(workflowDirectory, '..');
const dashboardSource = path.join(repositoryRoot, 'dashboard');
const canonicalDirectory = path.resolve(
  process.env.CANONICAL_SNAPSHOT_DIR || path.join(repositoryRoot, 'research', 'canonical'),
);
const outputDirectory = path.resolve(
  process.env.DASHBOARD_OUTPUT_DIR || path.join(repositoryRoot, 'dist'),
);
const submissionApiUrl = (process.env.DASHBOARD_SUBMISSION_API_URL || '').trim().replace(/\/$/, '');

if (submissionApiUrl) {
  const url = new URL(submissionApiUrl);
  const localDevelopment = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('DASHBOARD_SUBMISSION_API_URL must use HTTPS, except for local development.');
  }
}

const validation = await validateCanonicalSnapshot(canonicalDirectory);
if (validation.status !== 'PASS') {
  throw new Error(`Canonical snapshot is not deployable:\n${JSON.stringify(validation, null, 2)}`);
}

const manifest = JSON.parse(
  await readFile(path.join(canonicalDirectory, 'manifest.json'), 'utf8'),
);

const artifactFiles = Object.values(manifest.artifacts || {}).map(({ file }) => file);
if (artifactFiles.length === 0) {
  throw new Error('The canonical manifest does not reference any artifacts.');
}

for (const file of artifactFiles) {
  if (typeof file !== 'string' || path.basename(file) !== file) {
    throw new Error(`Unsafe manifest artifact filename: ${String(file)}`);
  }
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, 'data'), { recursive: true });
await cp(dashboardSource, outputDirectory, { recursive: true });
await cp(
  path.join(canonicalDirectory, 'manifest.json'),
  path.join(outputDirectory, 'data', 'manifest.json'),
);

for (const file of artifactFiles) {
  await cp(
    path.join(canonicalDirectory, file),
    path.join(outputDirectory, 'data', file),
  );
}

await writeFile(
  path.join(outputDirectory, 'snapshot.json'),
  `${JSON.stringify({
    snapshot_id: manifest.snapshot_id,
    contract_version: manifest.contract_version,
    generated_at: manifest.generated_at,
    validation_status: 'PASS',
  }, null, 2)}\n`,
  'utf8',
);

await writeFile(
  path.join(outputDirectory, 'runtime-config.json'),
  `${JSON.stringify({
    submission_api_url: submissionApiUrl,
    submission_mode: submissionApiUrl ? 'moderated' : 'disabled',
    max_upload_bytes: MAX_FILE_BYTES,
  }, null, 2)}\n`,
  'utf8',
);

console.log(
  JSON.stringify({
    status: 'PASS',
    output: outputDirectory,
    snapshot_id: manifest.snapshot_id,
    artifacts: artifactFiles.length,
    submission_mode: submissionApiUrl ? 'moderated' : 'disabled',
  }),
);
