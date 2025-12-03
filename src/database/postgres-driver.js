// postgres-driver.js

import SQLDriver from "./sql-driver.js";
import DriverRegistry from "./driver-registry.js";
import parseDatabaseURI from "../utility/parse-database-uri.js";

/**
 * PostgresDriver
 *
 * Implements SQLDriver for PostgreSQL using `pg` client.
 */
export default class PostgresDriver extends SQLDriver {
  pool = null;
  client = null; // used for transactions
  pgModule = null;

  constructor() {
    super();
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
    if (this.pool) {
      return;
    }

    const { Pool } = await import("pg");
    this.pgModule = { Pool };

    // ------------------------------------------------------------
    // Parse URI + optional options
    // ------------------------------------------------------------
    const uri = system.server.getString("database_uri"); // required
    const options = system.server.getObject("database_options", {});

    const parsed = parseDatabaseURI(uri);

    if (!parsed.host || !parsed.database || !parsed.username) {
      throw new Error(
        "PostgresDriver: database_uri must include host, database, and username."
      );
    }

    const poolConfig = {
      host: parsed.host,
      port: parsed.port || 5432,
      user: parsed.username,
      password: parsed.password,
      database: parsed.database,
      max: options.connectionLimit ?? 10,
      ssl: options.ssl ?? false,
      ...options, // any other pg Pool options
    };

    this.pool = new Pool(poolConfig);

    // Test connection
    const client = await this.pool.connect();
    client.release();

    system.log.info(
      `[PostgresDriver] Connected to ${poolConfig.database}@${poolConfig.host}:${poolConfig.port}`
    );
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      system.log.info("[PostgresDriver] Disconnected.");
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
      system.log.error(
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
