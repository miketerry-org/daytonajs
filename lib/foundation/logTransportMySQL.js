// logTransportMySQL.js:

"use strict";

import LogTransport from "./logTransport.js";
import levels from "./logLevels.js";

let mysql = null;

export default class MySQLLogTransport extends LogTransport {
  /**
   * options must contain:
   * {
   *   host: string,             // hostname or IP
   *   user: string,             // database user
   *   password?: string,        // password
   *   database: string,         // database name
   *   port?: number,            // default 3306
   *   level?: string,           // minimum log level (default "log")
   *   table?: string,           // table name (default "logs")
   *   connectOptions?: object   // optional mysql2 connection options
   * }
   */
  constructor(options = {}) {
    super("mysql", options);

    if (!options.host) throw new Error("MySQLLogTransport: 'host' is required");
    if (!options.user) throw new Error("MySQLLogTransport: 'user' is required");
    if (!options.database)
      throw new Error("MySQLLogTransport: 'database' is required");

    this.config = {
      host: options.host,
      user: options.user,
      password: options.password ?? "",
      database: options.database,
      port: options.port ?? 3306,
      ...options.connectOptions,
    };

    this.table = options.table ?? "logs";
    this.level = options.level ?? "log";

    this.connection = null;
    this.ready = this.init();
  }

  async init() {
    if (!mysql) {
      mysql = import("mysql2/promise");
    }

    this.connection = await mysql.createConnection(this.config);

    // Create table if it doesn’t exist
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS \`${this.table}\` (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME(6) NOT NULL,
        level VARCHAR(16) NOT NULL,
        message TEXT NOT NULL,
        meta JSON NULL
      );
    `);

    // Add useful indexes
    await this.connection.execute(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_timestamp ON \`${this.table}\` (timestamp DESC);`
    );
    await this.connection.execute(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_level ON \`${this.table}\` (level);`
    );

    console.info(`[MySQLLogTransport] Connected, table: ${this.table}`);
  }

  async out(entry) {
    await this.ready;

    const minLevel = levels[this.level] ?? levels["log"];
    const entryLevel = levels[entry.level] ?? levels["log"];
    if (entryLevel > minLevel) return;

    try {
      await this.connection.execute(
        `INSERT INTO \`${this.table}\` (timestamp, level, message, meta) VALUES (?, ?, ?, ?)`,
        [
          entry.timestamp ??
            new Date().toISOString().slice(0, 19).replace("T", " "),
          entry.level,
          entry.message,
          entry.meta ? JSON.stringify(entry.meta) : null,
        ]
      );
    } catch (err) {
      console.error("[MySQLLogTransport] Failed to insert log:", err);
    }
  }

  async close() {
    try {
      if (this.connection) await this.connection.end();
      this.connection = null;
    } catch (err) {
      console.error("[MySQLLogTransport] Failed to close connection:", err);
    }
  }
}
