const { insertLog } = require('../db/database');

const COLORS = {
  RESET: '\x1b[0m',
  DIM: '\x1b[2m',
  INFO: '\x1b[36m',
  SUCCESS: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m'
};

function log(source, message, level = 'INFO') {
  const iso = new Date().toISOString();
  const color = COLORS[level] || COLORS.INFO;
  console.log(`${COLORS.DIM}[${iso}]${COLORS.RESET} ${color}[${level}]${COLORS.RESET} [${source}] ${message}`);
  try {
    insertLog(level, source, message);
  } catch (_) {
    // Database might not be initialized yet during early boot
  }
}

module.exports = { log };
