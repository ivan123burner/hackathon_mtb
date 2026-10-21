/* Generate printable QR assets pointing at the published demo URL. */
'use strict';

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const ROOT = path.resolve(__dirname, '..');
const URL = process.env.MOBY_PUBLIC_URL || 'https://ivan123burner.github.io/hackathon_mtb/?role=parent&source=qr';

async function build() {
  const outDir = path.join(ROOT, 'assets/img');
  await fs.promises.mkdir(outDir, { recursive: true });

  await QRCode.toFile(path.join(outDir, 'qr-app.svg'), URL, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 1024,
    color: { dark: '#071B3D', light: '#FFFFFF' }
  });
  await QRCode.toFile(path.join(outDir, 'qr-app.png'), URL, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 1024,
    color: { dark: '#071B3D', light: '#FFFFFF' }
  });
  console.log('QR assets written to assets/img (target: ' + URL + ')');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
