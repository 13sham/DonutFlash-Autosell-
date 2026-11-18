require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n=== DONUT // AUTO-SELL — ENVIRONMENT DIAGNOSTICS ===');
const checks = [
  { label: 'Node.js >= 18', ok: Number(process.versions.node.split('.')[0]) >= 18, detail: process.version },
  { label: '.env file exists', ok: fs.existsSync(path.join(__dirname, '..', '.env')), detail: '.env' },
  { label: 'Eldorado Client ID set', ok: Boolean(process.env.ELDO_CLIENT_ID && !process.env.ELDO_CLIENT_ID.startsWith('your_')), detail: process.env.ELDO_CLIENT_ID ? 'Configured' : 'Missing' },
  { label: 'Eldorado Client Secret set', ok: Boolean(process.env.ELDO_CLIENT_SECRET && !process.env.ELDO_CLIENT_SECRET.startsWith('your_')), detail: process.env.ELDO_CLIENT_SECRET ? 'Configured' : 'Missing' },
  { label: 'Minecraft Worker Email set', ok: Boolean(process.env.MC_USERNAME && !process.env.MC_USERNAME.startsWith('worker_account@')), detail: process.env.MC_USERNAME || 'Missing' }
];

for (const c of checks) {
  console.log(`${c.ok ? '[PASS]' : '[WARN]'} ${c.label} -> ${c.detail}`);
}
console.log('');
