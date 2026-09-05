import path from 'node:path';
import { validateCanonicalSnapshot, writeCanonicalManifest } from './canonical-contract.mjs';

const directory = path.resolve(process.argv[2] || 'research/canonical');
const manifest = await writeCanonicalManifest(directory);
const validation = await validateCanonicalSnapshot(directory);
console.log(JSON.stringify({ directory, manifest, validation }, null, 2));
if (validation.status !== 'PASS') process.exitCode = 1;
