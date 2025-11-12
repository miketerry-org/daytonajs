// mysql-driver.js:

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * MySQLDriver
 *
 * Implements SQLDriver interface using `mysql2/promise`.
 * Shares all CRUD and query logic with other SQL drivers.
 */
export default class MySQLDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.pool = null;
    this.connection = null;
    this.mysqlModule = null;

    this.config = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ?? 3306,
      connectionLimit: config.connectionLimit ?? 5,
    };
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "mysql";
  }

  /* =============================================================
   * Configuration Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("host", true, 1, 255)
      .isString("user", true, 1, 255)
      .isString("password", true, 0, 255) // allow empty password
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 3306);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return; // already connected

    await this.verifyConfig(this.config);

    // Lazy-load mysql2/promise dynamically
    const mysql = await import("mysql2/promise");
    this.mysqlModule = mysql;

    this.pool = mysql.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port,
      connectionLimit: this.config.connectionLimit,
      supportBigNumbers: true,
      bigNumberStrings: false,
      multipleStatements: false,
    });

    // Verify the connection works immediately
    const conn = await this.pool.getConnection();
    conn.release();

    console.log(
      `[MySQLDriver] Connected to ${this.config.database}@${this.config.host}:${this.config.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("[MySQLDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("MySQLDriver: Database not connected.");

    const conn = this.connection || (await this.pool.getConnection());
    try {
      const [rows, fields] = await conn.execute(sql, params);
      // emulate rowCount for consistency with PostgreSQL/MariaDB
      rows.rowCount = Array.isArray(rows) ? rows.length : 0;
      return rows;
    } catch (err) {
      console.error("[MySQLDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    } finally {
      if (!this.connection) conn.release();
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("MySQLDriver: Not connected.");
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
   * Table Name Formatting (SQL conventions)
   * ============================================================= */
  formatTableName(modelName) {
    // MySQL prefers lowercase plural snake_case
    // e.g. "UserModel" → "users", "ServerConfigModel" → "server_configs"
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // MySQL convention: `id` auto_increment integer
    return logicalKey;
  }
}

// Register this driver globally
DriverRegistry.add("mysql", MySQLDriver);
// mysql-driver.js:

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * MySQLDriver
 *
 * Implements SQLDriver interface using `mysql2/promise`.
 * Shares all CRUD and query logic with other SQL drivers.
 */
export default class MySQLDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.pool = null;
    this.connection = null;
    this.mysqlModule = null;

    this.config = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ?? 3306,
      connectionLimit: config.connectionLimit ?? 5,
    };
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "mysql";
  }

  /* =============================================================
   * Configuration Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("host", true, 1, 255)
      .isString("user", true, 1, 255)
      .isString("password", true, 0, 255) // allow empty password
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 3306);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return; // already connected

    await this.verifyConfig(this.config);

    // Lazy-load mysql2/promise dynamically
    const mysql = await import("mysql2/promise");
    this.mysqlModule = mysql;

    this.pool = mysql.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port,
      connectionLimit: this.config.connectionLimit,
      supportBigNumbers: true,
      bigNumberStrings: false,
      multipleStatements: false,
    });

    // Verify the connection works immediately
    const conn = await this.pool.getConnection();
    conn.release();

    console.log(
      `[MySQLDriver] Connected to ${this.config.database}@${this.config.host}:${this.config.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("[MySQLDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("MySQLDriver: Database not connected.");

    const conn = this.connection || (await this.pool.getConnection());
    try {
      const [rows, fields] = await conn.execute(sql, params);
      // emulate rowCount for consistency with PostgreSQL/MariaDB
      rows.rowCount = Array.isArray(rows) ? rows.length : 0;
      return rows;
    } catch (err) {
      console.error("[MySQLDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    } finally {
      if (!this.connection) conn.release();
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("MySQLDriver: Not connected.");
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
   * Table Name Formatting (SQL conventions)
   * ============================================================= */
  formatTableName(modelName) {
    // MySQL prefers lowercase plural snake_case
    // e.g. "UserModel" → "users", "ServerConfigModel" → "server_configs"
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // MySQL convention: `id` auto_increment integer
    return logicalKey;
  }
}

// Register this driver globally
DriverRegistry.add("mysql", MySQLDriver);
