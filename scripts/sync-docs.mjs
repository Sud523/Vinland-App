/**
 * Runs `npx expo export -p web --clear`, then replaces `docs/` with `dist/`
 * so GitHub Pages (branch `/docs`) always matches the latest static web build.
 *
 * Usage: `npm run export:docs`
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
