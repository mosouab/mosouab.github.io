// Generates qr/mosouab-site-qr.{svg,png} pointing at the deployed site.
import { mkdir } from 'node:fs/promises';
import QRCode from 'qrcode';

const URL = process.argv[2] ?? 'https://mosouab.github.io';

await mkdir('qr', { recursive: true });
await QRCode.toFile('qr/mosouab-site-qr.svg', URL, {
  type: 'svg',
  margin: 2,
  color: { dark: '#161616', light: '#fbfbfa' },
});
await QRCode.toFile('qr/mosouab-site-qr.png', URL, {
  width: 1024,
  margin: 2,
  color: { dark: '#161616', light: '#fbfbfa' },
});

console.log(`QR codes written to qr/ for ${URL}`);
