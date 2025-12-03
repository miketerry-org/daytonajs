// console-logger.js:

import AbstractLogger from "./abstract-logger.js";

export default class ConsoleLogger extends AbstractLogger {
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formatted = this.format(message, meta);

    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }
}
