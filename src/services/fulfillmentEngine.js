const eldorado = require('./eldorado');
const botWorker = require('../bot/mineflayerWorker');
const { sendDiscordEmbed } = require('./webhook');
const {
  getOrderById,
  upsertOrder,
  updateOrderStatus,
  listSkus
} = require('../db/database');
const { log } = require('../utils/logger');

class FulfillmentEngine {
  constructor() {
    this.running = true;
    this.pollTimer = null;
    this.isPolling = false;
  }

  start() {
    const interval = parseInt(process.env.POLL_INTERVAL_MS || '8000', 10);
    log('ENGINE', `Fulfillment loop started (polling every ${interval}ms)`);
    this.pollTimer = setInterval(() => this.tick(), interval);
  }

  setRunning(state) {
    this.running = Boolean(state);
    log('ENGINE', `Engine state changed to ${this.running ? 'RUNNING' : 'PAUSED'}`);
    return this.running;
  }

  resolveSkuConfig(offerId) {
    const skus = listSkus();
    const match = skus.find((s) => s.offer_id === offerId && s.enabled === 1);
    return {
      unitMultiplier: match ? Number(match.unit_multiplier) : Number(process.env.DEFAULT_UNIT_MULTIPLIER || 1_000_000),
      cmdTemplate: match ? match.cmd_template : (process.env.DELIVERY_CMD_TEMPLATE || '/pay {ign} {amount}'),
      autoPauseBelow: match ? Number(match.auto_pause_below) : Number(process.env.MIN_SAFE_VAULT_BALANCE || 500_000_000)
    };
  }

  async fulfillSingleOrder(order) {
    const skuCfg = this.resolveSkuConfig(order.offer_id);
    const executedCmd = await botWorker.executePayout(order.ign, order.amount_raw, skuCfg.cmdTemplate);
    await eldorado.markOrderDelivered(order.id);

    updateOrderStatus(order.id, 'DELIVERED', `Executed: ${executedCmd}`);
    log('FULFILL', `Completed Order ${order.id} -> ${order.ign} (${executedCmd})`, 'SUCCESS');

    await sendDiscordEmbed({
      title: `Order Delivered // ${order.id}`,
      description: `Automated DonutSMP transfer completed and confirmed on Eldorado.gg.`,
      color: 0x10b981,
      fields: [
        { name: 'Buyer IGN', value: `\`${order.ign}\``, inline: true },
        { name: 'Amount', value: `\`${Number(order.amount_raw).toLocaleString()}\``, inline: true },
        { name: 'Sale Value', value: `$${Number(order.price_usd || 0).toFixed(2)}`, inline: true },
        { name: 'Executed Command', value: `\`${executedCmd}\``, inline: false }
      ]
    });

    // Low-balance auto-pause guardrail
    const telemetry = botWorker.getTelemetry();
    if (order.offer_id && telemetry.balance > 0 && telemetry.balance < skuCfg.autoPauseBelow) {
      await eldorado.pauseOffer(order.offer_id);
      await sendDiscordEmbed({
        title: `Low Vault Balance Alert`,
        description: `Bot balance dropped to **$${telemetry.balance.toLocaleString()}**. Offer \`${order.offer_id}\` has been auto-paused.`,
        color: 0xf59e0b
      });
    }
  }

  async tick() {
    if (!this.running || this.isPolling) return;
    this.isPolling = true;

    try {
      const rawOrders = await eldorado.fetchPaidOrders(25);
      if (!Array.isArray(rawOrders)) return;

      for (const raw of rawOrders) {
        const orderId = String(raw.id || raw.orderId || '');
        if (!orderId) continue;

        const existing = getOrderById(orderId);
        if (existing) continue;

        const offerId = String(raw.offerId || process.env.ELDO_DEFAULT_OFFER_ID || '');
        const ign = (
          raw.deliveryDetails?.characterName ||
          raw.buyerCharacterName ||
          raw.buyerNickname ||
          ''
        ).trim();

        const quantity = Math.max(1, Number(raw.quantity || 1));
        const skuCfg = this.resolveSkuConfig(offerId);
        const amountRaw = quantity * skuCfg.unitMultiplier;
        const priceUsd = Number(raw.totalPrice?.amount || raw.price || 0);
        const skuTitle = raw.offerTitle || `${quantity}x DonutSMP Unit`;

        upsertOrder({
          id: orderId,
          offer_id: offerId,
          ign,
          sku: skuTitle,
          quantity,
          amount_raw: amountRaw,
          price_usd: priceUsd,
          status: 'PROCESSING',
          tx_log: 'Ingested from Eldorado Seller API'
        });

        log('ELDO-INGEST', `New Paid Order ${orderId} | Buyer IGN: ${ign || 'MISSING'} | Qty: ${quantity}`);

        if (!ign) {
          updateOrderStatus(orderId, 'FAILED', 'Buyer did not provide a Minecraft IGN');
          continue;
        }

        try {
          await this.fulfillSingleOrder({
            id: orderId,
            offer_id: offerId,
            ign,
            sku: skuTitle,
            amount_raw: amountRaw,
            price_usd: priceUsd
          });
        } catch (err) {
          updateOrderStatus(orderId, 'FAILED', err.message);
          log('FULFILL-ERR', `Order ${orderId} failed: ${err.message}`, 'ERROR');
        }
      }
    } catch (err) {
      if (!err.message.includes('not configured')) {
        log('POLLER', `Poll cycle warning: ${err.message}`, 'WARN');
      }
    } finally {
      this.isPolling = false;
    }
  }
}

module.exports = new FulfillmentEngine();
