// logTransportFile.js:

"use strict";

import { createWriteStream, promises as fsPromises } from "fs";
import { join, dirname } from "path";
import LogTransport from "../log-transport.js";
import logLevels from "../log-levels.js";

const { mkdir } = fsPromises;

function formatDate(date) {
  return date.toISOString().slice(0, 10); // "yyyy-mm-dd"
}

export default class FileLogTransport extends LogTransport {
  /**
   * options:
   * {
   *   folderPath: string,  // directory where daily log files will be stored (required)
   *   level?: string,      // minimum log level (default "log")
   * }
   */
  constructor(options = {}) {
    super("file", options);

    if (!options.folderPath) {
      throw new Error("FileLogTransport: 'folderPath' option is required");
    }

    this.folderPath = options.folderPath;
    this.level = options.level ?? "log";

    this.currentDate = null;
    this.stream = null;
    this.ready = this.init();
  }

  async init() {
    // Ensure folder exists
    await mkdir(this.folderPath, { recursive: true });
    // Open initial stream for today
    await this._openStreamForDate(new Date());
  }

  async _openStreamForDate(date) {
    // Close old stream if any
    if (this.stream) {
      await new Promise(resolve => this.stream.end(resolve));
      this.stream = null;
    }

    this.currentDate = formatDate(date);
    const filename = `${this.currentDate}.log`;
    const filepath = join(this.folderPath, filename);

    this.stream = createWriteStream(filepath, {
      flags: "a", // always append to daily log
      encoding: "utf8",
      autoClose: true,
    });

    this.stream.on("error", err => {
      console.error("[FileLogTransport] Stream error:", err);
    });
  }

  async out(entry) {
    await this.ready;

    const minLevel = levels[this.level] ?? levels["log"];
    const entryLevel = levels[entry.level] ?? levels["log"];
    if (entryLevel > minLevel) return;

    const entryDate = new Date(entry.timestamp ?? new Date());
    const entryDateString = formatDate(entryDate);

    // If log entry's date differs from current stream date, roll over
    if (entryDateString !== this.currentDate) {
      await this._openStreamForDate(entryDate);
    }

    const logEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      level: entry.level,
      message: entry.message,
      meta: entry.meta ?? null,
    };

    const line = JSON.stringify(logEntry) + "\n";

    if (!this.stream.write(line)) {
      // backpressure handling
      await new Promise(resolve => this.stream.once("drain", resolve));
    }
  }

  async close() {
    if (!this.stream) return;

    return new Promise((resolve, reject) => {
      this.stream.end(() => {
        this.stream = null;
        resolve();
      });
      this.stream.on("error", err => {
        console.error("[FileLogTransport] Failed to close stream:", err);
        reject(err);
      });
    });
  }
}
