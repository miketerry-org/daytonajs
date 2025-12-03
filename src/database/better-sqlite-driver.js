// better-sqlite-driver.js

import path from "path";
import SQLDriver from "./sql-driver.js";
import Database from "better-sqlite3";
import parseDatabaseURI from "../utility/parse-database-uri.js";

/**
 * BetterSqliteDriver (better-sqlite3)
 *
 * Implements SQLDriver using better-sqlite3 (local SQLite engine, no server required).
 */
export default class BetterSqliteDriver extends SQLDriver {
  #uri;
  #dbFile;
  #DB;

  constructor() {
    super();

    // ------------------------------------------------------------
    // Load global config
    // ------------------------------------------------------------
    this.#uri = system.server.getString("database_uri"); // required
    const configOptions = system.server.getObject("database_options", {});

    // ------------------------------------------------------------
    // Parse URI
    // ------------------------------------------------------------
    // SQLite URI can be file path or sqlite://absolute/path/to/db.sqlite
    const parsed = parseDatabaseURI(this.#uri);
    if (!parsed.database) {
      throw new Error(
        "BetterSqliteDriver: database file path missing in database_uri."
      );
    }

    // Resolve the database file path
    this.#dbFile = parsed.database;
    this.#configOptions = configOptions;
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
      system.log.debug("[SQLiteDriver] Connecting to:", this.#dbFile);

      // Open the database with options
      this.db = new Database(this.#dbFile, this.#configOptions);

      // Simple connection test
      const result = this.db.prepare("SELECT 1 AS ok").get();
      if (result?.ok === 1) {
        system.log.debug(`[SQLiteDriver] Connected to ${this.#dbFile}`);
      }
    } catch (err) {
      system.log.error("[SQLiteDriver] Failed to connect:", err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.db) {
      try {
        this.db.close();
        system.log.debug("[SQLiteDriver] Disconnected.");
      } catch (err) {
        system.log.warn("[SQLiteDriver] Error closing DB:", err.message);
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
      system.log.error(
        "[SQLiteDriver] SQL Error:",
        err.message + "\nQuery:" + sql
      );
      throw err;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.db) throw new Error("SQLiteDriver: Database not connected");
    this.db.exec("BEGIN TRANSACTION");
  }

  async commitTransaction() {
    if (!this.db) throw new Error("SQLiteDriver: Database not connected");
    this.db.exec("COMMIT");
  }

  async rollbackTransaction() {
    if (!this.db) throw new Error("SQLiteDriver: Database not connected");
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
