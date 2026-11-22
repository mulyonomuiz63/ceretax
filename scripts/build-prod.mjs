import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distIndexPath = path.join(rootDir, 'dist', 'index.html');
const compiledServerPath = path.join(rootDir, 'dist-server', 'server.js');

export async function runProductionBuild({ onlyIfMissing = false } = {}) {
  if (onlyIfMissing && fs.existsSync(distIndexPath) && fs.existsSync(compiledServerPath)) {
    return;
  }

  console.log('[build-prod] Building Vite frontend (dist/)...');
  const { build: viteBuild } = await import('vite');
  await viteBuild({
    root: rootDir,
    configFile: path.join(rootDir, 'vite.config.ts'),
  });

  console.log('[build-prod] Bundling Express backend (dist-server/server.js)...');
  const esbuild = await import('esbuild');
  fs.mkdirSync(path.join(rootDir, 'dist-server'), { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'server.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: compiledServerPath,
  });

  console.log('[build-prod] Production build completed successfully.');
}

// Run when executed directly from CLI (`node scripts/build-prod.mjs [--if-missing]`)
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const onlyIfMissing = process.argv.includes('--if-missing');
  runProductionBuild({ onlyIfMissing }).catch((err) => {
    console.error('[build-prod] Build failed:', err);
    process.exit(1);
  });
}
