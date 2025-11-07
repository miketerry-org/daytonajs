// mariadb-driver.js:

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * MariaDBDriver
 *
 * Implements the SQLDriver interface using the official `mariadb` client.
 * Inherits all standard CRUD, query, and transaction logic from SQLDriver.
 */
export default class MariaDBDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);
    this.pool = null;
    this.connection = null;
    this.mariadbModule = null;
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "mariadb";
  }

  /* =============================================================
   * Configuration Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("host", true, 1, 255)
      .isString("user", true, 1, 255)
      .isString("password", true, 0, 255) // allow empty passwords
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 3306);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return; // already connected

    await this.verifyConfig(this.config);

    // Lazy-load mariadb dependency
    const mariadb = await import("mariadb");
    this.mariadbModule = mariadb;

    // Create a small, efficient connection pool
    this.pool = mariadb.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port,
      connectionLimit: this.config.connectionLimit ?? 5,
      supportBigNumbers: true,
      bigNumberStrings: false,
    });

    // Verify a connection immediately
    const conn = await this.pool.getConnection();
    conn.release();
    console.log(
      `[MariaDBDriver] Connected to ${this.config.database}@${this.config.host}:${this.config.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("[MariaDBDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("MariaDBDriver: Database not connected.");

    // If a transaction is active, reuse its connection
    const conn = this.connection || (await this.pool.getConnection());
    let rows;

    try {
      rows = await conn.query(sql, params);

      // The mariadb client sometimes includes metadata as the last element
      if (
        Array.isArray(rows) &&
        rows.length &&
        typeof rows[rows.length - 1] === "object" &&
        "affectedRows" in rows[rows.length - 1]
      ) {
        const { affectedRows } = rows.pop();
        rows.rowCount = affectedRows;
      }

      return rows;
    } catch (err) {
      console.error("[MariaDBDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    } finally {
      // Only release if not in transaction
      if (!this.connection) conn.release();
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("MariaDBDriver: Not connected.");
    if (this.connection) throw new Error("Transaction already started.");

    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  async commitTransaction() {
    if (!this.connection) return;
    try {
      await this.connection.commit();
    } finally {
      this.connection.release();
      this.connection = null;
    }
  }

  async rollbackTransaction() {
    if (!this.connection) return;
    try {
      await this.connection.rollback();
    } finally {
      this.connection.release();
      this.connection = null;
    }
  }

  /* =============================================================
   * Table Name Formatting (SQLDriver override if needed)
   * ============================================================= */
  formatTableName(modelName) {
    // MariaDB convention: lowercase plural snake_case table names
    // e.g. "ServerConfigModel" → "server_configs"
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // MariaDB default primary key convention is `id` (auto_increment)
    return logicalKey;
  }
}

// Register this driver with the global registry
DriverRegistry.add("mariadb", MariaDBDriver);
