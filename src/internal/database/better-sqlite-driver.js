// better-sqlite-driver.js:

import SQLDriver from "./sql-driver.js";
import Database from "better-sqlite3";

/**
 * SQLiteDriver (better-sqlite3)
 *
 * Implements SQLDriver using better-sqlite3 (local SQLite engine, no server required).
 */
export default class BetterSqliteDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.db = null;

    this.config = {
      url: config.database_url, // e.g., ./data/app.db or :memory:
    };

    if (!this.config.url) {
      throw new Error(
        "SQLiteDriver requires a `url` (e.g., ./mydb.sqlite or :memory:)"
      );
    }
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "better-sqlite";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.db) return;

    try {
      // Open the database
      this.db = new Database(this.config.url);

      // Simple connection test
      const result = this.db.prepare("SELECT 1 AS ok").get();
      if (result?.ok === 1) {
        console.log(`[SQLiteDriver] Connected to ${this.config.url}`);
      }
    } catch (err) {
      console.error("[SQLiteDriver] Failed to connect:", err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.db) {
      try {
        this.db.close();
        console.log("[SQLiteDriver] Disconnected.");
      } catch (err) {
        console.warn("[SQLiteDriver] Error closing DB:", err.message);
      } finally {
        this.db = null;
      }
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

    try {
      const stmt = this.db.prepare(sql);
      const isSelect = /^\s*SELECT/i.test(sql);

      if (isSelect) {
        return stmt.all(params);
      } else {
        const info = stmt.run(params);
        return {
          changes: info.changes ?? 0,
          lastInsertRowid: info.lastInsertRowid ?? null,
        };
      }
    } catch (err) {
      console.error("[SQLiteDriver] SQL Error:", err.message, "\nQuery:", sql);
      throw err;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    this.db.exec("BEGIN TRANSACTION");
  }

  async commitTransaction() {
    this.db.exec("COMMIT");
  }

  async rollbackTransaction() {
    this.db.exec("ROLLBACK");
  }

  /* =============================================================
   * Table & Primary Key Formatting
   * ============================================================= */
  formatTableName(modelName) {
    // SQLite convention: lowercase plural snake_case
    return SQLDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    // SQLite typically uses INTEGER PRIMARY KEY AUTOINCREMENT
    return logicalKey;
  }
}
