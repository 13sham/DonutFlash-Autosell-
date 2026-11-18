const axios = require('axios');
const { log } = require('../utils/logger');

const BASE_URL = 'https://eldorado.gg';

class EldoradoClient {
  constructor() {
    this.accessToken = null;
    this.expiresAt = 0;
  }

  invalidateToken() {
    this.accessToken = null;
    this.expiresAt = 0;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) {
      return this.accessToken;
    }

    const clientId = process.env.ELDO_CLIENT_ID;
    const clientSecret = process.env.ELDO_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId.startsWith('your_')) {
      throw new Error('Eldorado Seller API credentials not configured in .env');
    }

    const response = await axios.post(
      `${BASE_URL}/api/authentication/seller/token`,
      { clientId, clientSecret },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 }
    );

    const token = response.data?.accessToken || response.data?.token;
    if (!token) {
      throw new Error('Eldorado OAuth response did not contain an accessToken');
    }

    this.accessToken = token;
    this.expiresAt = Date.now() + 14 * 60 * 1000;
    log('ELDO-OAUTH', 'Refreshed Eldorado Seller bearer token (14-minute TTL)');
    return this.accessToken;
  }

  async fetchPaidOrders(pageSize = 25) {
    const token = await this.getAccessToken();
    const res = await axios.get(`${BASE_URL}/api/seller/orders`, {
      params: { status: 'Paid', pageSize },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000
    });
    return res.data?.results || res.data?.items || res.data || [];
  }

  async markOrderDelivered(orderId) {
    const token = await this.getAccessToken();
    await axios.post(
      `${BASE_URL}/api/seller/orders/${encodeURIComponent(orderId)}/deliver`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 }
    );
    log('ELDO-API', `Marked order ${orderId} as Delivered on Eldorado.gg`, 'SUCCESS');
  }

  async updateOfferPrice(offerId, pricePerUnit) {
    const token = await this.getAccessToken();
    await axios.patch(
      `${BASE_URL}/api/seller/offers/${encodeURIComponent(offerId)}`,
      { pricePerUnit: Number(pricePerUnit) },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 }
    );
    log('ELDO-PRICING', `Updated Offer ${offerId} unit price to $${pricePerUnit}`, 'SUCCESS');
  }

  async pauseOffer(offerId) {
    const token = await this.getAccessToken();
    await axios.post(
      `${BASE_URL}/api/seller/offers/${encodeURIComponent(offerId)}/pause`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 }
    );
    log('ELDO-STOCK', `Auto-paused Offer ${offerId} due to low vault balance`, 'WARN');
  }
}

module.exports = new EldoradoClient();
