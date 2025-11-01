// logTransportLibSQL.js:

"use strict";

import LogTransport from "./logTransport.js";
import levels from "./logLevels.js";

// this import is done lazy when the first instance of the class is created
let createClient = null;

export default class LibSQLLogTransport extends LogTransport {
  /**
   * options must contain:
   * {
   *   url: string,                // e.g. "file:./logs.db" or Turso URL
   *   authToken?: string,         // if using Turso
   *   level?: string,             // minimum log level (default "log")
   *   table?: string,             // table name (default "logs")
   *   connectOptions?: object     // optional client options
   * }
   */
  constructor(options = {}) {
    super("sqlite", options);

    this.url = options.url;
    this.authToken = options.authToken;
    this.table = options.table ?? "logs";
    this.connectOptions = options.connectOptions ?? {};

    if (!this.url) throw new Error("SQLiteLogTransport: 'url' is required");

    this.client = null;
    this.ready = this.init();
  }

  async init() {
    if (!createClient) {
      createClient = await import("@libsql/client");
    }

    this.client = createClient({
      url: this.url,
      authToken: this.authToken,
      ...this.connectOptions,
    });

    // Create table if it doesn’t exist
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        meta TEXT
      );
    `);

    // Create useful indexes
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_timestamp ON ${this.table}(timestamp DESC);`
    );
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_level ON ${this.table}(level);`
    );

    console.info(
      `[SQLiteLogTransport] Connected to ${this.url}, table: ${this.table}`
    );
  }

  async out(entry) {
    await this.ready;

    const minLevel = levels[this.level] ?? levels["log"];
    const entryLevel = levels[entry.level] ?? levels["log"];
    if (entryLevel > minLevel) return;

    try {
      await this.client.execute({
        sql: `INSERT INTO ${this.table} (timestamp, level, message, meta) VALUES (?, ?, ?, ?)`,
        args: [
          entry.timestamp ?? new Date().toISOString(),
          entry.level,
          entry.message,
          entry.meta ? JSON.stringify(entry.meta) : null,
        ],
      });
    } catch (err) {
      console.error("[SQLiteLogTransport] Failed to insert log:", err);
    }
  }

  async close() {
    try {
      if (this.client && this.client.close) await this.client.close();
      this.client = null;
    } catch (err) {
      console.error("[SQLiteLogTransport] Failed to close connection:", err);
    }
  }
}
