const express = require('express');
const router = express.Router();

const eldorado = require('../services/eldorado');
const botWorker = require('../bot/mineflayerWorker');
const engine = require('../services/fulfillmentEngine');
const {
  getRecentLogs,
  getOrderById,
  listOrders,
  updateOrderStatus,
  getStats,
  listSkus,
  upsertSku,
  deleteSku
} = require('../db/database');
const { log } = require('../utils/logger');

router.get('/status', (req, res) => {
  const stats = getStats();
  const telemetry = botWorker.getTelemetry();
  res.json({
    ok: true,
    storeName: process.env.STORE_NAME || 'DONUT // AUTO-SELL',
    engineRunning: engine.running,
    bot: telemetry,
    stats,
    logs: getRecentLogs(50)
  });
});

router.get('/orders', (req, res) => {
  res.json({ ok: true, orders: listOrders(100) });
});

router.post('/orders/:id/retry', async (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

  try {
    await engine.fulfillSingleOrder(order);
    res.json({ ok: true });
  } catch (err) {
    updateOrderStatus(order.id, 'FAILED', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/orders/:id/deliver', async (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

  try {
    await eldorado.markOrderDelivered(order.id);
    updateOrderStatus(order.id, 'DELIVERED', 'Manually marked delivered via Control Plane');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/engine/toggle', (req, res) => {
  const next = typeof req.body?.running === 'boolean' ? req.body.running : !engine.running;
  engine.setRunning(next);
  res.json({ ok: true, engineRunning: engine.running });
});

router.post('/bot/command', (req, res) => {
  const command = String(req.body?.command || '').trim();
  if (!command) return res.status(400).json({ ok: false, error: 'Command string required' });

  try {
    botWorker.sendCommand(command);
    log('CONSOLE', `Executed manual command: ${command}`);
    res.json({ ok: true, command });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

router.get('/skus', (req, res) => {
  res.json({ ok: true, skus: listSkus() });
});

router.post('/skus', (req, res) => {
  const { offer_id, label, unit_multiplier, price_per_billion, cmd_template, auto_pause_below, enabled } = req.body || {};
  if (!offer_id || !label) {
    return res.status(400).json({ ok: false, error: 'offer_id and label are required' });
  }
  upsertSku({
    offer_id: String(offer_id).trim(),
    label: String(label).trim(),
    unit_multiplier: Number(unit_multiplier || 1_000_000),
    price_per_billion: Number(price_per_billion || 13.8),
    cmd_template: String(cmd_template || '/pay {ign} {amount}'),
    auto_pause_below: Number(auto_pause_below || 500_000_000),
    enabled: enabled === false ? 0 : 1
  });
  log('SKU-MGR', `Saved SKU mapping for Offer ${offer_id}`);
  res.json({ ok: true, skus: listSkus() });
});

router.delete('/skus/:offerId', (req, res) => {
  deleteSku(req.params.offerId);
  log('SKU-MGR', `Removed SKU mapping for Offer ${req.params.offerId}`, 'WARN');
  res.json({ ok: true, skus: listSkus() });
});

router.post('/pricing/push', async (req, res) => {
  const { offerId, pricePerUnit } = req.body || {};
  if (!offerId || !pricePerUnit) {
    return res.status(400).json({ ok: false, error: 'offerId and pricePerUnit are required' });
  }
  try {
    await eldorado.updateOfferPrice(offerId, pricePerUnit);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/config', (req, res) => {
  const { eldoClientId, eldoClientSecret, offerId, mcHost, mcUsername, discordWebhook } = req.body || {};
  if (eldoClientId) process.env.ELDO_CLIENT_ID = eldoClientId;
  if (eldoClientSecret) process.env.ELDO_CLIENT_SECRET = eldoClientSecret;
  if (offerId) process.env.ELDO_DEFAULT_OFFER_ID = offerId;
  if (mcHost) process.env.MC_HOST = mcHost;
  if (mcUsername) process.env.MC_USERNAME = mcUsername;
  if (discordWebhook !== undefined) process.env.DISCORD_WEBHOOK_URL = discordWebhook;

  eldorado.invalidateToken();
  log('CONFIG', 'Runtime credentials updated via Control Plane');
  res.json({ ok: true });
});

module.exports = router;
