import { validateCanonicalSnapshot } from './canonical-contract.mjs';

const directory = process.argv[2] || 'research/canonical';
const result = await validateCanonicalSnapshot(directory);
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;

