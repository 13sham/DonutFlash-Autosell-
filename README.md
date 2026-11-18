# DONUT // AUTO-SELL v3.0 — Enterprise Self-Hosted Fulfillment Suite

A modular, zero-subscription automated order fulfillment server and Vercel-styled web control plane built for **Eldorado.gg** sellers operating on **DonutSMP** (`play.donutsmp.net`).

---

## Modular Architecture

```text
donut-autosell-v3/
├── public/
│   └── index.html                  # Vercel Geist Control Plane (SHA-256 Vault Gate, Live Queue, SKU Manager, $/B Calc)
├── src/
│   ├── server.js                   # Express HTTP server & static dashboard host
│   ├── api/
│   │   └── routes.js               # REST endpoints for orders, SKUs, pricing push, bot console & hot config
│   ├── bot/
│   │   └── mineflayerWorker.js     # play.donutsmp.net Mineflayer client, SOCKS5 proxy tunnel, /bal parser & anti-AFK
│   ├── db/
│   │   └── database.js             # WAL-mode SQLite persistence (orders, sku_mappings, logs)
│   ├── services/
│   │   ├── eldorado.js             # Eldorado Seller OAuth 14m auto-refresh, order poller & offer price/pause client
│   │   ├── fulfillmentEngine.js    # Deduplicated order processor, payout guardrails & low-stock auto-pause
│   │   └── webhook.js              # Rich Discord embed dispatcher
│   └── utils/
│       └── logger.js               # Timestamped console & SQLite audit logger
├── scripts/
│   ├── init-setup.js               # Interactive CLI `.env` generator (`npm run setup`)
│   ├── healthcheck.js              # Pre-flight environment diagnostics (`npm run doctor`)
│   └── backup-db.js                # One-command SQLite ledger backup (`npm run backup`)
├── docs/
│   ├── API_REFERENCE.md            # Control Plane REST API specification
│   └── BUYER_HANDOVER.md           # Resale & client onboarding guide
├── ecosystem.config.js             # PM2 24/7 VPS process configuration
├── Dockerfile                      # Production container build
├── .env.example                    # Environment configuration template
└── package.json                    # NPM scripts & dependencies
```

---

## Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run Interactive Setup Wizard:**
   ```bash
   npm run setup
   ```
   *(Or copy `.env.example` to `.env` and fill in your credentials manually.)*
3. **Verify Configuration:**
   ```bash
   npm run doctor
   ```
4. **Launch Server & Authorize Microsoft Login:**
   ```bash
   npm start
   ```
   On first boot, `prismarine-auth` prints a `https://www.microsoft.com/link` code in your terminal. Complete the login once; your session token is cached in `.minecraft-cache/`.
5. **Open Control Plane:**
   Navigate to `http://localhost:3000` to activate your Store Name, License Key, and local SHA-256 Vault Passcode.

---

## 24/7 VPS Deployment (PM2)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
