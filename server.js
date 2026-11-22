import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compiledServerPath = path.join(rootDir, 'dist-server', 'server.js');
const distIndexPath = path.join(rootDir, 'dist', 'index.html');

// Default to production when booted via root server.js (also guards against "prodaction" typo)
if (!process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase() === 'prodaction') {
  process.env.NODE_ENV = 'production';
}

// Auto-build frontend & backend once if host deployed with "Build command: none"
if (!fs.existsSync(compiledServerPath) || !fs.existsSync(distIndexPath)) {
  console.log('[server.js] Build artifacts not found. Running "npm run build"...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

await import(pathToFileURL(compiledServerPath).href);
