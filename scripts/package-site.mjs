// Run after npm run build, from the repository root.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const archive = process.argv[2];
if (!archive) throw Error('Provide an output archive path.');
execFileSync('tar', ['-czf', resolve(archive), '.openai/hosting.json', 'dist', 'drizzle'], { stdio: 'inherit' });
