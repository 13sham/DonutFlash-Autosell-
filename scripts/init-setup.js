const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

(async () => {
  console.log('\n=== DONUT // AUTO-SELL v3.0 — INTERACTIVE SETUP ===\n');
  const storeName = (await ask('1. Store / Brand Name [DonutVault Exchange]: ')) || 'DonutVault Exchange';
  const port = (await ask('2. Control Plane Port [3000]: ')) || '3000';
  const eldoId = await ask('3. Eldorado Seller Client ID: ');
  const eldoSecret = await ask('4. Eldorado Seller Client Secret: ');
  const offerId = await ask('5. Default Eldorado Offer ID: ');
  const mcUser = await ask('6. Minecraft Bot Email (Microsoft Auth): ');
  const webhook = await ask('7. Discord Webhook URL (optional): ');

  const envContent = [
    `PORT=${port}`,
    `NODE_ENV=production`,
    `STORE_NAME="${storeName}"`,
    `POLL_INTERVAL_MS=8000`,
    `ELDO_CLIENT_ID=${eldoId || 'your_eldorado_client_id'}`,
    `ELDO_CLIENT_SECRET=${eldoSecret || 'your_eldorado_client_secret'}`,
    `ELDO_DEFAULT_OFFER_ID=${offerId || 'offer-278-xxxxxxxx'}`,
    `MC_HOST=play.donutsmp.net`,
    `MC_PORT=25565`,
    `MC_VERSION=1.20.4`,
    `MC_USERNAME=${mcUser || 'worker_account@outlook.com'}`,
    `MC_AUTH=microsoft`,
    `ANTI_AFK_INTERVAL_MS=45000`,
    `DEFAULT_UNIT_MULTIPLIER=1000000`,
    `DELIVERY_CMD_TEMPLATE="/pay {ign} {amount}"`,
    `MIN_SAFE_VAULT_BALANCE=500000000`,
    `MAX_SINGLE_ORDER_PAYOUT=50000000000`,
    `DISCORD_WEBHOOK_URL=${webhook}`
  ].join('\n');

  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`\n[OK] Wrote configuration to ${envPath}`);
  console.log('[NEXT] Run `npm start` to launch the server and authorize Microsoft login.\n');
  rl.close();
})();
