// logTransportConsole.js:

"use strrict";

import LogTransport from "./logTransport.js";
import logLevels from "./logLevels.js";

export default class ConsoleLogTransport extends LogTransport {
  constructor(options = {}) {
    super("console", options);
  }

  out(entry) {
    const { level, timestamp, message, meta } = entry;
    const minLevel = levels[this.level];

    if (levels[level] <= minLevel) {
      const text = `${timestamp} [${level.toUpperCase()}] ${message}`;
      if (meta) {
        console[level] ? console[level](text, meta) : console.log(text, meta);
      } else {
        console[level] ? console[level](text) : console.log(text);
      }
    }
  }
}
