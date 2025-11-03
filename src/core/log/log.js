// log.js:

"use strict";

import logLevels from "./log-levels.js";

export default class Log {
  constructor() {
    this.transports = [];
    this.timers = new Map();
  }

  addTransport(transport) {
    this.transports.push(transport);
  }

  removeTransportByName(name) {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  log(level, message, meta) {
    if (!logLevels.hasOwnProperty(level)) {
      throw new Error(`Unknown log level: ${level}`);
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        console.error(`Logger transport "${transport.name}" failed:`, err);
      }
    }
  }

  // Convenience methods
  info(msg, meta) {
    this.log("info", msg, meta);
  }

  warn(msg, meta) {
    this.log("warn", msg, meta);
  }

  error(msg, meta) {
    this.log("error", msg, meta);
  }

  debug(msg, meta) {
    this.log("debug", msg, meta);
  }

  // Timer utilities
  time(label) {
    this.timers.set(label, process.hrtime());
  }

  timeEnd(label) {
    const start = this.timers.get(label);
    if (!start) {
      this.warn(`No such timer: ${label}`);
      return;
    }
    const diff = process.hrtime(start);
    const ms = diff[0] * 1e3 + diff[1] / 1e6;
    this.timers.delete(label);
    this.info(`${label}: ${ms.toFixed(3)}ms`);
  }
}
