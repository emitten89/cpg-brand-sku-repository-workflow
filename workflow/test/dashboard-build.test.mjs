import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..', '..');

test('dashboard build emits a complete manifest-bound static bundle', async (context) => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'cpg-dashboard-'));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));

  execFileSync(process.execPath, [path.join(repositoryRoot, 'workflow', 'build-dashboard.mjs')], {
    cwd: repositoryRoot,
    env: { ...process.env, DASHBOARD_OUTPUT_DIR: outputDirectory },
    stdio: 'pipe',
  });

  for (const file of ['index.html', 'styles.css', 'app.js', 'snapshot.json', 'data/manifest.json']) {
    const fileStats = await stat(path.join(outputDirectory, file));
    assert.ok(fileStats.isFile(), `${file} should be emitted`);
    assert.ok(fileStats.size > 0, `${file} should not be empty`);
  }

  const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'data', 'manifest.json'), 'utf8'));
  const snapshot = JSON.parse(await readFile(path.join(outputDirectory, 'snapshot.json'), 'utf8'));
  assert.equal(snapshot.snapshot_id, manifest.snapshot_id);
  assert.equal(snapshot.validation_status, 'PASS');

  for (const artifact of Object.values(manifest.artifacts)) {
    const bytes = await readFile(path.join(outputDirectory, 'data', artifact.file));
    assert.equal(bytes.byteLength, artifact.bytes, `${artifact.file} byte count`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256, `${artifact.file} sha256`);
  }
});

test('dashboard build fails closed before emitting a checksum-mismatched snapshot', async (context) => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'cpg-dashboard-invalid-'));
  context.after(() => rm(testRoot, { recursive: true, force: true }));
  const snapshotDirectory = path.join(testRoot, 'canonical');
  const outputDirectory = path.join(testRoot, 'site');
  await cp(path.join(repositoryRoot, 'research', 'canonical'), snapshotDirectory, { recursive: true });

  const sourcePath = path.join(snapshotDirectory, 'sources.json');
  const sourceText = await readFile(sourcePath, 'utf8');
  await writeFile(sourcePath, `${sourceText}\n`, 'utf8');

  assert.throws(
    () => execFileSync(process.execPath, [path.join(repositoryRoot, 'workflow', 'build-dashboard.mjs')], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CANONICAL_SNAPSHOT_DIR: snapshotDirectory,
        DASHBOARD_OUTPUT_DIR: outputDirectory,
      },
      stdio: 'pipe',
    }),
    (error) => error.stderr.toString().includes('SNAPSHOT_INTEGRITY_ERROR'),
  );

  await assert.rejects(stat(outputDirectory), { code: 'ENOENT' });
});
