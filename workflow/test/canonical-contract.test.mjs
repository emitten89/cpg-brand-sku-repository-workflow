import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FAILURE_CLASSIFICATIONS,
  publishCanonicalSnapshot,
  REQUIRED_ARTIFACTS,
  validateCanonicalSnapshot,
  writeCanonicalManifest
} from '../canonical-contract.mjs';

const fixtureDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'valid');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;

async function copyFixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'canonical-contract-'));
  await fs.cp(fixtureDirectory, directory, { recursive: true });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function readManifest(directory) {
  return JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
}

async function writeManifest(directory, manifest) {
  await fs.writeFile(path.join(directory, 'manifest.json'), serialize(manifest), 'utf8');
}

test('accepts a complete, valid canonical snapshot', async () => {
  const result = await validateCanonicalSnapshot(fixtureDirectory);
  assert.equal(result.status, 'PASS');
  assert.equal(result.phase, 'complete');
  assert.deepEqual(result.classifications, []);
  assert.equal(result.skuRows, 1);
});

test('publishes a staged snapshot only after validation', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'canonical-publish-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const artifacts = {};
  for (const artifact of REQUIRED_ARTIFACTS) {
    artifacts[artifact.key] = JSON.parse(await fs.readFile(path.join(fixtureDirectory, artifact.defaultFile), 'utf8'));
  }

  const directory = path.join(root, 'canonical');
  const manifest = await publishCanonicalSnapshot({
    directory,
    artifacts,
    metadata: {
      generatedAt: '2026-09-01T12:00:00.000Z',
      client: { slug: 'acme-cpg', name: 'Acme CPG' },
      markets: ['USA']
    }
  });

  assert.equal(manifest.contract_version, '1.0.0');
  assert.equal((await validateCanonicalSnapshot(directory)).status, 'PASS');
});

test('classifies and reports every missing artifact before semantic validation', async t => {
  const directory = await copyFixture(t);
  await Promise.all([
    fs.rm(path.join(directory, 'sku_library.json')),
    fs.rm(path.join(directory, 'sources.json'))
  ]);

  const result = await validateCanonicalSnapshot(directory);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.phase, 'preflight');
  assert(result.classifications.includes(FAILURE_CLASSIFICATIONS.BUILD_INCOMPLETE));
  assert.deepEqual(
    result.errors.filter(error => error.code === 'ARTIFACT_MISSING').map(error => error.file).sort(),
    ['sku_library.json', 'sources.json']
  );
  assert(!result.classifications.includes(FAILURE_CLASSIFICATIONS.DATA_QUALITY_ERROR));
});

test('rejects an unsupported manifest before reading semantic data', async t => {
  const directory = await copyFixture(t);
  const manifest = await readManifest(directory);
  manifest.schema_version = '2.0.0';
  await writeManifest(directory, manifest);

  const result = await validateCanonicalSnapshot(directory);
  assert.equal(result.phase, 'preflight');
  assert(result.classifications.includes(FAILURE_CLASSIFICATIONS.MANIFEST_INVALID));
  assert(result.errors.some(error => error.code === 'UNSUPPORTED_SCHEMA_VERSION'));
});

test('rejects a checksum mismatch before semantic validation', async t => {
  const directory = await copyFixture(t);
  await fs.appendFile(path.join(directory, 'sku_library.json'), '\n', 'utf8');

  const result = await validateCanonicalSnapshot(directory);
  assert.equal(result.phase, 'preflight');
  assert(result.classifications.includes(FAILURE_CLASSIFICATIONS.SNAPSHOT_INTEGRITY_ERROR));
  assert(result.errors.some(error => error.code === 'CHECKSUM_MISMATCH' && error.file === 'sku_library.json'));
  assert(!result.classifications.includes(FAILURE_CLASSIFICATIONS.DATA_QUALITY_ERROR));
});

test('classifies malformed JSON when the manifest matches the published bytes', async t => {
  const directory = await copyFixture(t);
  const malformed = Buffer.from('{"records":[\n', 'utf8');
  await fs.writeFile(path.join(directory, 'sku_library.json'), malformed);
  const manifest = await readManifest(directory);
  manifest.artifacts.sku_library.bytes = malformed.length;
  manifest.artifacts.sku_library.sha256 = createHash('sha256').update(malformed).digest('hex');
  await writeManifest(directory, manifest);

  const result = await validateCanonicalSnapshot(directory);
  assert.equal(result.phase, 'preflight');
  assert(result.classifications.includes(FAILURE_CLASSIFICATIONS.MALFORMED_JSON));
  assert(result.errors.some(error => error.code === 'ARTIFACT_JSON_INVALID' && error.file === 'sku_library.json'));
  assert(!result.classifications.includes(FAILURE_CLASSIFICATIONS.DATA_QUALITY_ERROR));
});

test('runs referential checks only after a clean preflight', async t => {
  const directory = await copyFixture(t);
  const skuPath = path.join(directory, 'sku_library.json');
  const skuLibrary = JSON.parse(await fs.readFile(skuPath, 'utf8'));
  skuLibrary.records[0].brand = 'Unknown Brand';
  await fs.writeFile(skuPath, serialize(skuLibrary), 'utf8');
  await writeCanonicalManifest(directory);

  const result = await validateCanonicalSnapshot(directory);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.phase, 'semantic');
  assert.deepEqual(result.classifications, [FAILURE_CLASSIFICATIONS.DATA_QUALITY_ERROR]);
  assert(result.errors.some(error => error.code === 'SKU_BRAND_REFERENCE_MISSING'));
});
