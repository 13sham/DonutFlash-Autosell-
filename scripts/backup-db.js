const fs = require('fs');
const path = require('path');

const srcDb = path.join(__dirname, '..', 'data', 'donut_autosell.db');
const backupDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(srcDb)) {
  console.error('[ERROR] No SQLite database found at data/donut_autosell.db yet.');
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(backupDir, `donut_autosell_${stamp}.db`);
fs.copyFileSync(srcDb, dest);
console.log(`[OK] Database backed up to ${dest}`);
