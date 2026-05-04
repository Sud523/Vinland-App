/**
 * Runs `npx expo export -p web --clear`, then replaces `docs/` with `dist/`
 * so GitHub Pages (branch `/docs`) always matches the latest static web build.
 *
 * Loads `.env` from the repo root into `process.env` before export so
 * EXPO_PUBLIC_* keys are inlined into the bundle (same as `expo start`).
 *
 * Usage: `npm run export:docs`
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const docs = join(root, 'docs');

/** Minimal KEY=value loader so export sees EXPO_PUBLIC_* without extra deps. */
function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(join(root, '.env'));

execSync('npx expo export -p web --clear', { cwd: root, stdio: 'inherit', env: process.env });
rmSync(docs, { recursive: true, force: true });
mkdirSync(docs, { recursive: true });
cpSync(dist, docs, { recursive: true });

/*
  GitHub Pages runs Jekyll by default; it does NOT publish paths starting with `_`.
  Expo web output lives under `docs/_expo/` — without this file the JS bundle 404s and
  the site shows a blank white page while HTML still loads.
*/
writeFileSync(join(docs, '.nojekyll'), '');
console.log('Synced dist/ → docs/ for GitHub Pages (wrote docs/.nojekyll for underscore paths).');
