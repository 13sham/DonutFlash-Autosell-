const axios = require('axios');
const { log } = require('../utils/logger');

async function sendDiscordEmbed({ title, description, color = 0x10b981, fields = [] }) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !url.startsWith('http')) return false;

  try {
    await axios.post(
      url,
      {
        embeds: [
          {
            title,
            description,
            color,
            fields,
            footer: { text: 'DONUT // AUTO-SELL v3.0 • Self-Hosted Control Plane' },
            timestamp: new Date().toISOString()
          }
        ]
      },
      { timeout: 8000 }
    );
    return true;
  } catch (err) {
    log('WEBHOOK', `Discord dispatch error: ${err.message}`, 'WARN');
    return false;
  }
}

module.exports = { sendDiscordEmbed };
