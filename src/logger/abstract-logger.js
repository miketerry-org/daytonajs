// abstract-logger.js

import Abstract from "../../internal/utility/abstract.js";

export default class AbstractLogger extends Abstract {
  /**
   * @param {string} level - minimum log level to output ('debug'|'info'|'warn'|'error')
   */
  constructor(level = "debug") {
    super();
    this.level = level;
    this.levels = ["debug", "info", "warn", "error"];
  }

  shouldLog(level) {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.level);
  }

  /**
   * Central logging method to be implemented by subclasses
   * @param {string} level
   * @param {string} message
   * @param {object} meta
   */
  log(level, message, meta = {}) {
    this.notImplemented("log");
  }

  // Convenience wrappers
  debug(message, meta = {}) {
    this.log("debug", message, meta);
  }
  info(message, meta = {}) {
    this.log("info", message, meta);
  }
  warn(message, meta = {}) {
    this.log("warn", message, meta);
  }
  error(message, meta = {}) {
    this.log("error", message, meta);
  }

  /**
   * Formats message with timestamp and optional metadata
   * @param {string} message
   * @param {object} meta
   * @returns {string}
   */
  format(message, meta = {}) {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] ${message}`;
    return meta && Object.keys(meta).length > 0
      ? `${base} | ${JSON.stringify(meta)}`
      : base;
  }
}
