const path = require('path');
const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const { log } = require('../utils/logger');

class DonutBotWorker {
  constructor() {
    this.bot = null;
    this.online = false;
    this.balance = 0;
    this.ping = 0;
    this.afkTimer = null;
    this.reconnectTimer = null;
  }

  start() {
    const host = process.env.MC_HOST || 'play.donutsmp.net';
    const port = parseInt(process.env.MC_PORT || '25565', 10);
    const username = process.env.MC_USERNAME;

    if (!username || username.startsWith('worker_account@')) {
      log('BOT-WORKER', 'MC_USERNAME not configured in .env; standing by.', 'WARN');
      return;
    }

    const profilesFolder = path.join(__dirname, '..', '..', '.minecraft-cache');
    const options = {
      host,
      port,
      username,
      version: process.env.MC_VERSION || '1.20.4',
      auth: process.env.MC_AUTH || 'microsoft',
      profilesFolder
    };

    if (process.env.SOCKS_HOST) {
      options.connect = (client) => {
        SocksClient.createConnection(
          {
            proxy: {
              host: process.env.SOCKS_HOST,
              port: parseInt(process.env.SOCKS_PORT || '1080', 10),
              type: 5,
              userId: process.env.SOCKS_USER || undefined,
              password: process.env.SOCKS_PASS || undefined
            },
            command: 'connect',
            destination: { host, port }
          },
          (err, info) => {
            if (err) {
              log('BOT-PROXY', `SOCKS5 connection failed: ${err.message}`, 'ERROR');
              return;
            }
            client.setSocket(info.socket);
            client.emit('connect');
          }
        );
      };
    }

    log('BOT-WORKER', `Connecting to ${host}:${port} as ${username}...`);
    this.bot = mineflayer.createBot(options);

    this.bot.on('spawn', () => {
      this.online = true;
      this.ping = this.bot.player?.ping || 0;
      log('BOT-WORKER', `Spawned on ${host} as ${this.bot.username}`, 'SUCCESS');
      setTimeout(() => this.sendCommand('/bal'), 3000);
    });

    this.bot.on('messagestr', (rawMsg) => {
      const msg = rawMsg.trim();
      if (!msg) return;

      const balMatch = msg.match(/Balance:\s*\$([0-9,.]+)([BMK]?)/i);
      if (balMatch) {
        let parsed = parseFloat(balMatch[1].replace(/,/g, ''));
        const suffix = (balMatch[2] || '').toUpperCase();
        if (suffix === 'B') parsed *= 1e9;
        else if (suffix === 'M') parsed *= 1e6;
        else if (suffix === 'K') parsed *= 1e3;
        if (!Number.isNaN(parsed)) {
          this.balance = parsed;
        }
      }
    });

    this.bot.on('kicked', (reason) => {
      this.online = false;
      log('BOT-WORKER', `Kicked from server: ${reason}`, 'WARN');
    });

    this.bot.on('end', () => {
      this.online = false;
      log('BOT-WORKER', 'Disconnected from server. Reconnecting in 15s...', 'WARN');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.start(), 15_000);
    });

    this.bot.on('error', (err) => {
      log('BOT-WORKER', `Client error: ${err.message}`, 'ERROR');
    });

    clearInterval(this.afkTimer);
    const afkInterval = parseInt(process.env.ANTI_AFK_INTERVAL_MS || '45000', 10);
    this.afkTimer = setInterval(() => {
      if (this.bot && this.online && this.bot.entity) {
        this.bot.look(this.bot.entity.yaw + 0.4, 0, true);
        this.ping = this.bot.player?.ping || this.ping;
      }
    }, afkInterval);
  }

  sendCommand(cmd) {
    if (!this.bot || !this.online) {
      throw new Error('Mineflayer worker bot is currently offline');
    }
    this.bot.chat(cmd);
    return cmd;
  }

  async executePayout(ign, amountRaw, template = '/pay {ign} {amount}') {
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(ign)) {
      throw new Error(`Invalid Minecraft IGN format: "${ign}"`);
    }

    const maxCap = Number(process.env.MAX_SINGLE_ORDER_PAYOUT || 50_000_000_000);
    if (amountRaw <= 0 || amountRaw > maxCap) {
      throw new Error(`Payout ${amountRaw} violates safety cap (${maxCap})`);
    }

    const cmd = template
      .replace('{ign}', ign)
      .replace('{amount}', String(Math.floor(amountRaw)));

    this.sendCommand(cmd);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    if (this.online) {
      this.sendCommand('/bal');
    }
    return cmd;
  }

  getTelemetry() {
    return {
      online: this.online,
      username: this.bot?.username || null,
      balance: this.balance,
      ping: this.ping,
      host: process.env.MC_HOST || 'play.donutsmp.net'
    };
  }
}

module.exports = new DonutBotWorker();
