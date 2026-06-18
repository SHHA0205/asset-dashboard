import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[FATAL] dist/index.html not found. Run: npm run build');
  process.exit(1);
}

console.log('[OK] dist/index.html exists');