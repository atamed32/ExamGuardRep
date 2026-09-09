import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '../dist-electron');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function buildElectron() {
  console.log('Building Electron Main and Preload scripts...');

  // Build Main Process
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    outfile: path.join(outDir, 'main.cjs'),
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    minify: process.env.NODE_ENV !== 'development'
  });

  // Build Preload Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    outfile: path.join(outDir, 'preload.cjs'),
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    minify: process.env.NODE_ENV !== 'development'
  });

  console.log('Electron build completed successfully.');
}

buildElectron().catch((err) => {
  console.error('Error building electron:', err);
  process.exit(1);
});
