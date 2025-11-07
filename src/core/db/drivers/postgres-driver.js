// postgres-driver.js:

import verify from "../../utility/verify.js";
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
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "postgres";
  }

  /* =============================================================
   * Configuration Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("host", true, 1, 255)
      .isString("user", true, 1, 255)
      .isString("password", false, 0, 255)
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 5432);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return;

    this.verifyConfig(this.config);

    const { Pool } = await import("pg");
    this.pgModule = { Pool };

    this.pool = new Pool(this.config);

    // test connection immediately
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
      // Normalize for consistency with MySQL/MariaDB
      result.rows.rowCount = result.rowCount ?? result.rows.length ?? 0;
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
    // PostgreSQL prefers lowercase plural snake_case
    // e.g. "UserModel" → "users", "ServerConfigModel" → "server_configs"
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // For PostgreSQL: standard "id" SERIAL PRIMARY KEY or UUID, depending on schema
    return logicalKey;
  }
}

// Register globally
DriverRegistry.add("postgres", PostgresDriver);
