import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, '../build');
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect x="24" y="24" width="464" height="464" rx="100" fill="url(#shieldGrad)" stroke="#334155" stroke-width="8" />

  <!-- Academic / Security Shield -->
  <path d="M 256,70 L 400,120 C 400,280 256,410 256,430 C 256,410 112,280 112,120 Z" 
        fill="#1e293b" stroke="url(#emeraldGrad)" stroke-width="12" />

  <!-- Graduation Cap -->
  <path d="M 256,160 L 360,205 L 256,250 L 152,205 Z" fill="url(#emeraldGrad)" />
  <path d="M 200,227 L 200,265 C 200,290 312,290 312,265 L 312,227" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round" />
  
  <!-- Tassel -->
  <path d="M 335,215 L 345,265" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-linecap="round" />
  <circle cx="345" cy="270" r="6" fill="#fbbf24" />

  <!-- Checkmark Emblem -->
  <circle cx="256" cy="335" r="45" fill="#0f172a" stroke="#10b981" stroke-width="6" />
  <path d="M 235,335 L 250,350 L 280,318" fill="none" stroke="#34d399" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

async function generate() {
  const svgBuffer = Buffer.from(svgContent);

  // Write SVG files
  fs.writeFileSync(path.join(buildDir, 'icon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon.png'));

  // Generate multi-resolution PNG buffers for ICO
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // Build multi-image ICO file buffer
  const count = sizes.length;
  const headerSize = 6;
  const directorySize = 16 * count;
  let offset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  const directoryEntries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const imgBuf = pngBuffers[i];
    const entry = Buffer.alloc(16);

    entry.writeUInt8(size === 256 ? 0 : size, 0); // width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(imgBuf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    directoryEntries.push(entry);
    offset += imgBuf.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...directoryEntries,
    ...pngBuffers
  ]);

  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('Successfully generated icon.ico (multi-res 256, 128, 64, 48, 32, 16) and icon.png (512x512)!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
