// mariadb-driver.js

// -----------------------------------------------------------------------------
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
      .isString("password", true, 0, 255)
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 3306);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return;

    await this.verifyConfig(this.config);

    const mariadb = await import("mariadb");
    this.mariadbModule = mariadb;

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

    const conn = this.connection || (await this.pool.getConnection());
    let result;

    try {
      result = await conn.query(sql, params);

      // Normalize rowCount for consistency with SQLDriver expectations
      if (Array.isArray(result)) {
        result.rowCount = result.affectedRows ?? result.length;
      } else if (
        result &&
        typeof result === "object" &&
        "affectedRows" in result
      ) {
        result.rowCount = result.affectedRows;
      }

      return result;
    } catch (err) {
      console.error("[MariaDBDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    } finally {
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
   * Table Name / Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    // MariaDB convention: lowercase plural snake_case table names
    return SQLDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return logicalKey; // default MariaDB primary key convention
  }
}

// Register this driver with the global registry
DriverRegistry.add("mariadb", MariaDBDriver);
