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
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
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

function readBaseUrl() {
  try {
    const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
    const u = app?.expo?.experiments?.baseUrl;
    if (typeof u === 'string' && u.startsWith('/')) {
      return u.replace(/\/$/, '') || '/Vinland-App';
    }
  } catch {
    /* ignore */
  }
  return '/Vinland-App';
}

/** First matching file under dir (depth-first). */
function findFileRecursive(dir, testName) {
  if (!existsSync(dir)) {
    return null;
  }
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      const inner = findFileRecursive(full, testName);
      if (inner) {
        return inner;
      }
    } else if (testName(name)) {
      return full;
    }
  }
  return null;
}

function urlFromDocs(absPath, base) {
  const rel = relative(docs, absPath).replace(/\\/g, '/');
  return `${base}/${rel}`;
}

function copyOptionalPwaAssets() {
  const srcDir = join(root, 'pwa-assets');
  const files = ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
  for (const name of files) {
    const src = join(srcDir, name);
    if (existsSync(src)) {
      cpSync(src, join(docs, name));
      console.log(`Copied pwa-assets/${name} → docs/${name}`);
    }
  }
}

function writeWebManifest(base) {
  const icons = [];
  if (existsSync(join(docs, 'icon-192.png'))) {
    icons.push({
      src: `${base}/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    });
  }
  if (existsSync(join(docs, 'icon-512.png'))) {
    icons.push({
      src: `${base}/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    });
  }
  if (icons.length === 0 && existsSync(join(docs, 'favicon.ico'))) {
    icons.push({
      src: `${base}/favicon.ico`,
      sizes: '48x48',
      type: 'image/x-icon',
      purpose: 'any',
    });
  }

  const manifest = {
    name: 'Vinland',
    short_name: 'Vinland',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#070A0F',
    theme_color: '#070A0F',
    icons,
  };
  writeFileSync(join(docs, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function patchIndexHtmlForPwaAndFont(base) {
  const indexPath = join(docs, 'index.html');
  let html = readFileSync(indexPath, 'utf8');

  html = html.replace(
    /<meta\s+name="viewport"\s+content="[^"]*"\s*\/?>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no" />',
  );

  const fontAbs = findFileRecursive(
    join(docs, 'assets'),
    (n) => n.endsWith('.ttf') && n.includes('PressStart2P'),
  );
  const fontFace =
    fontAbs != null
      ? `<style id="vinland-font-face">@font-face{font-family:'PressStart2P_400Regular';src:url('${urlFromDocs(fontAbs, base)}') format('truetype');font-weight:400;font-style:normal;font-display:swap;}</style>`
      : '';

  const appleTouch = existsSync(join(docs, 'apple-touch-icon.png'))
    ? `${base}/apple-touch-icon.png`
    : `${base}/favicon.ico`;

  const extraIcons = [];
  if (existsSync(join(docs, 'icon-192.png'))) {
    extraIcons.push(
      `<link rel="icon" type="image/png" sizes="192x192" href="${base}/icon-192.png" />`,
    );
  }
  if (existsSync(join(docs, 'icon-512.png'))) {
    extraIcons.push(
      `<link rel="icon" type="image/png" sizes="512x512" href="${base}/icon-512.png" />`,
    );
  }

  const inject = `
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <meta name="theme-color" content="#070A0F" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Vinland" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="${appleTouch}" />
    ${extraIcons.join('\n    ')}
    ${fontFace}`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${inject}\n  </head>`);
  } else {
    html = `<!DOCTYPE html><html><head>${inject}</head><body>${html}</body></html>`;
  }
  writeFileSync(indexPath, html);
}

execSync('npx expo export -p web --clear', { cwd: root, stdio: 'inherit', env: process.env });
rmSync(docs, { recursive: true, force: true });
mkdirSync(docs, { recursive: true });
cpSync(dist, docs, { recursive: true });

const pagesBaseUrl = readBaseUrl();
copyOptionalPwaAssets();
writeWebManifest(pagesBaseUrl);
patchIndexHtmlForPwaAndFont(pagesBaseUrl);
if (!existsSync(join(docs, 'apple-touch-icon.png'))) {
  console.warn(
    'No pwa-assets/apple-touch-icon.png — iOS home screen may use favicon only. Add a 180×180 PNG to pwa-assets/ and re-run export.',
  );
}

/*
  GitHub Pages runs Jekyll by default; it does NOT publish paths starting with `_`.
  Expo web output lives under `docs/_expo/` — without this file the JS bundle 404s and
  the site shows a blank white page while HTML still loads.
*/
writeFileSync(join(docs, '.nojekyll'), '');
console.log(
  'Synced dist/ → docs/ for GitHub Pages (wrote docs/.nojekyll, manifest, PWA head tags, optional @font-face).',
);
