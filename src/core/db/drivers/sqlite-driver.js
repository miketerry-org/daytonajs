// sqlite-driver.js:

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * SQLiteDriver (Turso-compatible)
 *
 * Implements SQLDriver using @libsql/client (works with local SQLite or remote Turso).
 */
export default class SQLiteDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.db = null;
    this.clientModule = null;

    this.config = {
      url: config.url, // e.g., file:./data/app.db or libsql://dbname.turso.io
      authToken: config.authToken ?? null, // for Turso remote DBs
    };

    if (!this.config.url) {
      throw new Error(
        "SQLiteDriver requires a `url` (e.g., file:./mydb.sqlite or libsql://your-db-url)"
      );
    }
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "sqlite";
  }

  /* =============================================================
   * Config Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("url", true, 1, 1024)
      .isString("authToken", false, 0, 1024);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.db) return;

    this.verifyConfig(this.config);

    const { createClient } = await import("@libsql/client");
    this.clientModule = { createClient };

    this.db = createClient({
      url: this.config.url,
      authToken: this.config.authToken ?? undefined,
    });

    // basic connection test
    try {
      await this.db.execute("SELECT 1 AS ok");
      console.log(`[SQLiteDriver] Connected to ${this.config.url}`);
    } catch (err) {
      console.error("[SQLiteDriver] Connection test failed:", err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.db && typeof this.db.close === "function") {
      await this.db.close();
      this.db = null;
      console.log("[SQLiteDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.db) throw new Error("SQLiteDriver: Database not connected");

    // Convert positional array params to libsql’s named binding format {1: value, 2: value, ...}
    const boundParams = Array.isArray(params)
      ? params.reduce((acc, val, idx) => {
          acc[idx + 1] = val;
          return acc;
        }, {})
      : params;

    try {
      const result = await this.db.execute(sql, boundParams);

      // Normalize the result
      const isSelect = /^\s*SELECT/i.test(sql);
      if (isSelect) {
        return result.rows || [];
      }

      return {
        changes: result.changes ?? 0,
        lastInsertRowid: result.lastInsertRowid ?? null,
      };
    } catch (err) {
      console.error("[SQLiteDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    await this.execute("BEGIN TRANSACTION");
  }

  async commitTransaction() {
    await this.execute("COMMIT");
  }

  async rollbackTransaction() {
    await this.execute("ROLLBACK");
  }

  /* =============================================================
   * Table & Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    // SQLite convention: lowercase plural snake_case (same as Postgres)
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // SQLite typically uses INTEGER PRIMARY KEY AUTOINCREMENT
    return logicalKey;
  }
}

// Register SQLite driver globally
DriverRegistry.add("sqlite", SQLiteDriver);
"use strict";

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * SQLiteDriver (Turso-compatible)
 *
 * Implements SQLDriver using @libsql/client (works with local SQLite or remote Turso).
 */
export default class SQLiteDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.db = null;
    this.clientModule = null;

    this.config = {
      url: config.url, // e.g., file:./data/app.db or libsql://dbname.turso.io
      authToken: config.authToken ?? null, // for Turso remote DBs
    };

    if (!this.config.url) {
      throw new Error(
        "SQLiteDriver requires a `url` (e.g., file:./mydb.sqlite or libsql://your-db-url)"
      );
    }
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "sqlite";
  }

  /* =============================================================
   * Config Validation
   * ============================================================= */
  verifyConfig(config) {
    return verify(config)
      .isString("url", true, 1, 1024)
      .isString("authToken", false, 0, 1024);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.db) return;

    this.verifyConfig(this.config);

    const { createClient } = await import("@libsql/client");
    this.clientModule = { createClient };

    this.db = createClient({
      url: this.config.url,
      authToken: this.config.authToken ?? undefined,
    });

    // basic connection test
    try {
      await this.db.execute("SELECT 1 AS ok");
      console.log(`[SQLiteDriver] Connected to ${this.config.url}`);
    } catch (err) {
      console.error("[SQLiteDriver] Connection test failed:", err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.db && typeof this.db.close === "function") {
      await this.db.close();
      this.db = null;
      console.log("[SQLiteDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.db) throw new Error("SQLiteDriver: Database not connected");

    // Convert positional array params to libsql’s named binding format {1: value, 2: value, ...}
    const boundParams = Array.isArray(params)
      ? params.reduce((acc, val, idx) => {
          acc[idx + 1] = val;
          return acc;
        }, {})
      : params;

    try {
      const result = await this.db.execute(sql, boundParams);

      // Normalize the result
      const isSelect = /^\s*SELECT/i.test(sql);
      if (isSelect) {
        return result.rows || [];
      }

      return {
        changes: result.changes ?? 0,
        lastInsertRowid: result.lastInsertRowid ?? null,
      };
    } catch (err) {
      console.error("[SQLiteDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    await this.execute("BEGIN TRANSACTION");
  }

  async commitTransaction() {
    await this.execute("COMMIT");
  }

  async rollbackTransaction() {
    await this.execute("ROLLBACK");
  }

  /* =============================================================
   * Table & Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    // SQLite convention: lowercase plural snake_case (same as Postgres)
    return super.constructor.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // SQLite typically uses INTEGER PRIMARY KEY AUTOINCREMENT
    return logicalKey;
  }
}

// Register SQLite driver globally
DriverRegistry.add("sqlite", SQLiteDriver);
