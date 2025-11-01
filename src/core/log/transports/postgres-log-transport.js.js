// logTransportPostgres.js

"use strict";

import LogTransport from "./logTransport.js";
import logLevels from "./logLevels.js";

const pkg = null;
// const { Client } = pkg;

export default class PostgresLogTransport extends LogTransport {
  /**
   * options must contain:
   * {
   *   connectionString: string,   // full postgres URL, or
   *   host?: string,
   *   port?: number,
   *   user?: string,
   *   password?: string,
   *   database?: string,
   *   ssl?: boolean|object,
   *   level?: string,             // minimum log level (default "log")
   *   table?: string,             // table name (default "logs")
   *   connectOptions?: object     // additional options for pg.Client
   * }
   */
  constructor(options = {}) {
    super("postgres", options);

    this.table = options.table ?? "logs";
    this.level = options.level ?? "log";
    this.connectOptions = options.connectOptions ?? {};

    if (
      !options.connectionString &&
      !(options.host && options.user && options.database)
    ) {
      throw new Error(
        "PostgresLogTransport: must provide either connectionString or host/user/database"
      );
    }

    this.config = options.connectionString
      ? { connectionString: options.connectionString }
      : {
          host: options.host,
          port: options.port ?? 5432,
          user: options.user,
          password: options.password,
          database: options.database,
          ssl: options.ssl ?? false,
        };

    this.client = null;
    this.ready = this.init();
  }

  async init() {
    if (pkg) {
      pkg = import("pg");
    }

    let { Client } = pkg;

    this.client = new Client({ ...this.config, ...this.connectOptions });
    await this.client.connect();

    // Create table if not exists
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        meta JSONB
      );
    `);

    // Create useful indexes
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_timestamp ON ${this.table}(timestamp DESC);`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_${this.table}_level ON ${this.table}(level);`
    );

    console.info(`[PostgresLogTransport] Connected, table: ${this.table}`);
  }

  async out(entry) {
    await this.ready;

    const minLevel = levels[this.level] ?? levels["log"];
    const entryLevel = levels[entry.level] ?? levels["log"];
    if (entryLevel > minLevel) return;

    try {
      await this.client.query(
        `INSERT INTO ${this.table} (timestamp, level, message, meta) VALUES ($1, $2, $3, $4);`,
        [
          entry.timestamp ?? new Date().toISOString(),
          entry.level,
          entry.message,
          entry.meta ? JSON.stringify(entry.meta) : null,
        ]
      );
    } catch (err) {
      console.error("[PostgresLogTransport] Failed to insert log:", err);
    }
  }

  async close() {
    try {
      if (this.client) await this.client.end();
      this.client = null;
    } catch (err) {
      console.error("[PostgresLogTransport] Failed to close connection:", err);
    }
  }
}
