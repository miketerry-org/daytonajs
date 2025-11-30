// mysql-driver.js

import SQLDriver from "./sql-driver.js";
import DriverRegistry from "./driver-registry.js";
import parseDatabaseURI from "../utility/parse-database-uri.js";

/**
 * MySQLDriver
 *
 * Implements SQLDriver interface using `mysql2/promise`.
 * Shares all CRUD and query logic with other SQL drivers.
 */
export default class MySQLDriver extends SQLDriver {
  pool = null;
  connection = null;
  mysqlModule = null;

  constructor() {
    super();
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "mysql";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return;

    const mysql = await import("mysql2/promise");
    this.mysqlModule = mysql;

    // ------------------------------------------------------------
    // Parse URI + additional options
    // ------------------------------------------------------------
    const uri = system.server.getString("database_uri"); // required
    const options = system.server.getObject("database_options", {});

    const parsed = parseDatabaseURI(uri);

    if (!parsed.host || !parsed.database) {
      throw new Error(
        "MySQLDriver: database_uri must include host and database."
      );
    }

    const poolOptions = {
      host: parsed.host,
      port: parsed.port || 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.database,
      connectionLimit: options.connectionLimit || 5,
      supportBigNumbers: true,
      bigNumberStrings: false,
      multipleStatements: false,
      ...options, // any other custom options
    };

    this.pool = mysql.createPool(poolOptions);

    // Test connection
    const conn = await this.pool.getConnection();
    conn.release();

    system.log.info(
      `[MySQLDriver] Connected to ${poolOptions.database}@${poolOptions.host}:${poolOptions.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      system.log.info("[MySQLDriver] Disconnected.");
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
      const [rows] = await conn.execute(sql, params);
      rows.rowCount = Array.isArray(rows) ? rows.length : 0;
      return rows;
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
   * Table & Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    return SQLDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return logicalKey;
  }
}

// Register driver globally
DriverRegistry.add("mysql", MySQLDriver);
