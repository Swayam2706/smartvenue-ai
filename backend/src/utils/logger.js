/**
 * Structured logger — replaces console.log throughout the app
 * Outputs JSON in production, pretty in development
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PROD   = process.env.NODE_ENV === 'production';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 2;

function formatMessage(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'smartvenue-api',
    ...meta,
  };
  return IS_PROD ? JSON.stringify(entry) : `[${entry.timestamp}] ${level.toUpperCase()} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
}

const logger = {
  error: (msg, meta) => { if (currentLevel >= 0) console.error(formatMessage('error', msg, meta)); },
  warn:  (msg, meta) => { if (currentLevel >= 1) console.warn(formatMessage('warn',  msg, meta)); },
  info:  (msg, meta) => { if (currentLevel >= 2) console.info(formatMessage('info',  msg, meta)); },
  debug: (msg, meta) => { if (currentLevel >= 3) console.debug(formatMessage('debug', msg, meta)); },
  http:  (msg, meta) => { if (currentLevel >= 2) console.info(formatMessage('http',  msg, meta)); },
};

module.exports = logger;
