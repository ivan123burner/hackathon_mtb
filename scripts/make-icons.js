/* Generate PNG PWA icons from the source SVG. */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const source = path.join(ROOT, 'assets/icons/icon.svg');
const outDir = path.join(ROOT, 'assets/icons');

async function build() {
  await fs.promises.mkdir(outDir, { recursive: true });

  await sharp(source).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
  await sharp(source).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  await sharp(source).resize(180, 180).flatten({ background: '#071B3D' }).png().toFile(path.join(outDir, 'apple-touch-icon.png'));

  const mark = await sharp(source).resize(400, 400).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#071B3D' }
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512.png'));

  console.log('PWA icons generated in assets/icons');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
