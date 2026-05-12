import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const assets = resolve(root, 'assets');
const androidRes = resolve(root, 'android', 'app', 'src', 'main', 'res');

const fullSvg = await readFile(resolve(assets, 'logo-full.svg'));
const fgSvg = await readFile(resolve(assets, 'logo-fg.svg'));

const BG = { r: 14, g: 14, b: 16, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Render a buffer at the given square size. */
async function render(svg, size, transparent) {
  return sharp(svg, { density: 600 })
    .resize(size, size, {
      fit: 'contain',
      background: transparent ? TRANSPARENT : BG,
    });
}

// 1) Project-level assets (used by Expo's app.json / iOS / web).
const projectAssets = [
  { svg: fullSvg, out: 'icon.png', size: 1024, transparent: false },
  { svg: fullSvg, out: 'splash-icon.png', size: 1024, transparent: false },
  { svg: fgSvg, out: 'adaptive-icon.png', size: 1024, transparent: true },
  { svg: fullSvg, out: 'favicon.png', size: 96, transparent: false },
];
for (const a of projectAssets) {
  const buf = await (await render(a.svg, a.size, a.transparent)).png().toBuffer();
  await writeFile(resolve(assets, a.out), buf);
  console.log(`wrote assets/${a.out} (${a.size})`);
}

// 2) Android mipmap launcher icons (webp).
// Legacy / round launcher icons (full square, includes background).
// Adaptive foreground (transparent, draws over @color/iconBackground).
const densities = [
  { dir: 'mipmap-mdpi', legacy: 48, fg: 108 },
  { dir: 'mipmap-hdpi', legacy: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', legacy: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', legacy: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', legacy: 192, fg: 432 },
];

for (const d of densities) {
  const dirPath = resolve(androidRes, d.dir);
  await mkdir(dirPath, { recursive: true });

  const legacyBuf = await (await render(fullSvg, d.legacy, false)).webp({ quality: 95 }).toBuffer();
  await writeFile(resolve(dirPath, 'ic_launcher.webp'), legacyBuf);
  await writeFile(resolve(dirPath, 'ic_launcher_round.webp'), legacyBuf);

  const fgBuf = await (await render(fgSvg, d.fg, true)).webp({ quality: 95, lossless: true }).toBuffer();
  await writeFile(resolve(dirPath, 'ic_launcher_foreground.webp'), fgBuf);
  console.log(`wrote ${d.dir} (legacy ${d.legacy}px, fg ${d.fg}px)`);
}

console.log('icons regenerated.');
