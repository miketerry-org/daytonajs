// libsql-driver.js

import SQLDriver from "./sql-driver.js";
import parseDatabaseURI from "../utility/parse-database-uri.js";

/**
 * LibSqlDriver (Turso-compatible)
 *
 * Implements SQLDriver using @libsql/client (works with local SQLite or remote Turso).
 */
export default class LibSqlDriver extends SQLDriver {
  #db = null;
  #clientModule = null;
  #config = {};

  constructor() {
    super();

    // ------------------------------------------------------------
    // Load global config
    // ------------------------------------------------------------
    const uri = system.server.getString("database_uri"); // required
    const options = system.server.getObject("database_options", {});

    // ------------------------------------------------------------
    // Parse URI
    // ------------------------------------------------------------
    const parsed = parseDatabaseURI(uri);
    if (!parsed.host && !parsed.database) {
      throw new Error(
        "LibSqlDriver: database_uri must include host or database path."
      );
    }

    // Build config for @libsql/client
    this.#config.url = parsed.host
      ? `${parsed.host}/${parsed.database || ""}` // remote
      : parsed.database; // local file path

    // Any extra options (auth token, etc.) from config
    Object.assign(this.#config, options);
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "libsql";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.#db) return;

    const { createClient } = await import("@libsql/client");
    this.#clientModule = { createClient };

    this.#db = createClient(this.#config);

    // Basic connection test
    try {
      await this.#db.execute("SELECT 1 AS ok");
      system.log.debug(`[LibSqlDriver] Connected to ${this.#config.url}`);
    } catch (err) {
      system.log.error("[LibSqlDriver] Connection test failed:", err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.#db && typeof this.#db.close === "function") {
      await this.#db.close();
      this.#db = null;
      system.log.debug("[LibSqlDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.#db) throw new Error("LibSqlDriver: Database not connected");

    // Convert positional array params to libsql’s named binding format {1: value, 2: value, ...}
    const boundParams = Array.isArray(params)
      ? params.reduce((acc, val, idx) => {
          acc[idx + 1] = val;
          return acc;
        }, {})
      : params;

    try {
      const result = await this.#db.execute(sql, boundParams);

      // Normalize the result
      const isSelect = /^\s*SELECT/i.test(sql);
      if (isSelect) return result.rows || [];

      return {
        changes: result.changes ?? 0,
        lastInsertRowid: result.lastInsertRowid ?? null,
      };
    } catch (err) {
      system.log.error(
        "[LibSqlDriver] SQL Error:",
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
    return SQLDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return logicalKey;
  }
}
