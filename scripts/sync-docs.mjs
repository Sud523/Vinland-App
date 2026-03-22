/**
 * Run `npx expo export -p web --clear`, then replace docs/ with dist/
 * so GitHub Pages (docs folder) matches the latest web build.
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const docs = join(root, 'docs');

execSync('npx expo export -p web --clear', { cwd: root, stdio: 'inherit' });
rmSync(docs, { recursive: true, force: true });
mkdirSync(docs, { recursive: true });
cpSync(dist, docs, { recursive: true });

console.log('Synced dist/ → docs/ for GitHub Pages.');
