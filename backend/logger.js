// ================================
// Server-side Logger
// ================================
// Logger for backend/server.js (Node.js environment)

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Log debug information (only in development)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always, even in production)
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

module.exports = { logger };

