const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'donut_autosell.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    offer_id TEXT,
    ign TEXT,
    sku TEXT,
    quantity INTEGER DEFAULT 1,
    amount_raw INTEGER DEFAULT 0,
    price_usd REAL DEFAULT 0,
    status TEXT DEFAULT 'QUEUED',
    tx_log TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sku_mappings (
    offer_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    unit_multiplier INTEGER NOT NULL DEFAULT 1000000,
    price_per_billion REAL NOT NULL DEFAULT 13.80,
    cmd_template TEXT NOT NULL DEFAULT '/pay {ign} {amount}',
    auto_pause_below INTEGER NOT NULL DEFAULT 500000000,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function insertLog(level, source, message) {
  db.prepare('INSERT INTO logs (level, source, message) VALUES (?, ?, ?)').run(level, source, message);
}

function getRecentLogs(limit = 60) {
  return db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit);
}

function getOrderById(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function listOrders(limit = 100) {
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit);
}

function upsertOrder(order) {
  db.prepare(`
    INSERT INTO orders (id, offer_id, ign, sku, quantity, amount_raw, price_usd, status, tx_log)
    VALUES (@id, @offer_id, @ign, @sku, @quantity, @amount_raw, @price_usd, @status, @tx_log)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      tx_log = excluded.tx_log,
      updated_at = CURRENT_TIMESTAMP
  `).run(order);
}

function updateOrderStatus(id, status, txLog) {
  db.prepare(`
    UPDATE orders
    SET status = ?, tx_log = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, txLog, id);
}

function getStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) as deliveredOrders,
      COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) as failedOrders,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN price_usd ELSE 0 END), 0) as revenueUsd,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN amount_raw ELSE 0 END), 0) as totalCashDelivered
    FROM orders
  `).get();
}

function listSkus() {
  return db.prepare('SELECT * FROM sku_mappings ORDER BY updated_at DESC').all();
}

function upsertSku(sku) {
  db.prepare(`
    INSERT INTO sku_mappings (offer_id, label, unit_multiplier, price_per_billion, cmd_template, auto_pause_below, enabled)
    VALUES (@offer_id, @label, @unit_multiplier, @price_per_billion, @cmd_template, @auto_pause_below, @enabled)
    ON CONFLICT(offer_id) DO UPDATE SET
      label = excluded.label,
      unit_multiplier = excluded.unit_multiplier,
      price_per_billion = excluded.price_per_billion,
      cmd_template = excluded.cmd_template,
      auto_pause_below = excluded.auto_pause_below,
      enabled = excluded.enabled,
      updated_at = CURRENT_TIMESTAMP
  `).run(sku);
}

function deleteSku(offerId) {
  db.prepare('DELETE FROM sku_mappings WHERE offer_id = ?').run(offerId);
}

module.exports = {
  db,
  dbPath,
  insertLog,
  getRecentLogs,
  getOrderById,
  listOrders,
  upsertOrder,
  updateOrderStatus,
  getStats,
  listSkus,
  upsertSku,
  deleteSku
};
