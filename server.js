import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compiledServerPath = path.join(rootDir, 'dist-server', 'server.js');
const distIndexPath = path.join(rootDir, 'dist', 'index.html');

// Default to production when booted via root server.js (also guards against "prodaction" typo)
if (!process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase() === 'prodaction') {
  process.env.NODE_ENV = 'production';
}

// IMPORTANT: Do NOT use top-level await or execSync('npm ...') here!
// LiteSpeed lsnode.js (Hostinger) loads server.js via CJS require() and does not expose npm in PATH.
async function boot() {
  if (!fs.existsSync(compiledServerPath) || !fs.existsSync(distIndexPath)) {
    console.log('[server.js] Build artifacts missing, building programmatically via Vite & esbuild...');
    const { runProductionBuild } = await import(
      pathToFileURL(path.join(rootDir, 'scripts', 'build-prod.mjs')).href
    );
    await runProductionBuild({ onlyIfMissing: false });
  }

  await import(pathToFileURL(compiledServerPath).href);
}

boot().catch((err) => {
  console.error('[server.js] Fatal error starting KelasBrevet server:', err);
  process.exit(1);
});
