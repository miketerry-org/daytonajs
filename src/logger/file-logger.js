// fileLogger.js:

import path from "path";
import fs from "fs";
import AbstractLogger from "./abstract-logger.js";

export default class FileLogger extends AbstractLogger {
  export;
  /**
   * @param {string} filePath - folder where the log file will be created
   * @param {string} level - minimum log level
   */
  constructor(filePath, level = "debug") {
    super(level);

    if (!filePath) {
      throw new Error("FileLogger requires a 'filePath' parameter");
    }

    // Ensure folder exists
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    // Create log file with timestamp in the name
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-") // replace colon (invalid on Windows)
      .replace("T", "_")
      .split(".")[0]; // remove milliseconds

    this.logFile = path.join(filePath, `${timestamp}.log`);
  }

  /**
   * Write log entry to file asynchronously
   * @param {string} level
   * @param {string} message
   * @param {object} meta
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.format(message, meta) + "\n";

    fs.appendFile(this.logFile, formatted, err => {
      if (err) {
        // fallback to console if file write fails
        console.error("Failed to write log to file:", err);
      }
    });
  }
}
