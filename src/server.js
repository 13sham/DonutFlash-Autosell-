require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./api/routes');
const botWorker = require('./bot/mineflayerWorker');
const fulfillmentEngine = require('./services/fulfillmentEngine');
const { log } = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  log('SERVER', `DONUT // AUTO-SELL v3.0 Control Plane live at http://localhost:${PORT}`, 'SUCCESS');
  botWorker.start();
  fulfillmentEngine.start();
});
