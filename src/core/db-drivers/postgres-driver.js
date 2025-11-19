// postgres-driver.js

import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * PostgresDriver
 *
 * Implements SQLDriver for PostgreSQL using `pg` client.
 * Supports connection pooling, transactions, and parameterized queries.
 */
export default class PostgresDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.pgModule = null;
    this.pool = null;
    this.client = null; // used during transactions

    this.config = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ?? 5432,
      max: config.connectionLimit ?? 10,
      ssl: config.ssl ?? false,
    };

    // Basic validation
    if (!this.config.host || !this.config.user || !this.config.database) {
      throw new Error(
        "PostgresDriver requires `host`, `user`, and `database` in config"
      );
    }
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "postgres";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return;

    const { Pool } = await import("pg");
    this.pgModule = { Pool };

    this.pool = new Pool(this.config);

    // Test connection immediately
    const client = await this.pool.connect();
    client.release();

    console.log(
      `[PostgresDriver] Connected to ${this.config.database}@${this.config.host}:${this.config.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("[PostgresDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("PostgresDriver: Database not connected.");

    const executor = this.client || this.pool;

    try {
      const result = await executor.query(sql, params);

      // Normalize rowCount
      result.rows.rowCount =
        result.rowCount ??
        (Array.isArray(result.rows) ? result.rows.length : 0);

      return result.rows;
    } catch (err) {
      console.error(
        "[PostgresDriver] SQL Error:",
        err.message,
        "\nQuery:",
        sql
      );
      throw err;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("PostgresDriver: Not connected.");
    if (this.client) throw new Error("Transaction already in progress.");

    this.client = await this.pool.connect();
    await this.client.query("BEGIN");
  }

  async commitTransaction() {
    if (!this.client) return;
    try {
      await this.client.query("COMMIT");
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  async rollbackTransaction() {
    if (!this.client) return;
    try {
      await this.client.query("ROLLBACK");
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  /* =============================================================
   * Table & Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    return SQLDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return logicalKey;
  }
}

// Register globally
DriverRegistry.add("postgres", PostgresDriver);
