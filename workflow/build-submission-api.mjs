import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const workflowDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(workflowDirectory, '..');
const outputDirectory = path.join(repositoryRoot, '.tmp', 'neon-function');
const sourceDirectory = path.join(repositoryRoot, 'neon');
const source = await readFile(path.join(sourceDirectory, 'submissions.mjs'), 'utf8');

await mkdir(outputDirectory, { recursive: true });
await build({
  absWorkingDir: repositoryRoot,
  stdin: {
    contents: source,
    resolveDir: sourceDirectory,
    sourcefile: 'submissions.mjs',
    loader: 'js',
  },
  outfile: path.join(outputDirectory, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  banner: {
    js: "import{createRequire as ___cr}from'module';import{fileURLToPath as ___f}from'url';import{dirname as ___d}from'path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);",
  },
});

console.log(JSON.stringify({ status: 'PASS', output: path.join(outputDirectory, 'index.mjs') }));
