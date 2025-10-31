// driverMariaDB.js

"use strict";

import SQLDriver from "./driverSQL.js";
import Registry from "./registry.js";

export default class MariaDBDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 3306 } = config;
    if (!host || !user || !database) {
      throw new Error(
        "MariaDBDriver requires `host`, `user`, and `database` in config."
      );
    }

    this.config = { host, user, password, database, port };
    this.pool = null;
    this.connection = null;
  }

  static driverName() {
    return "mariadb";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return; // already connected

    // Dynamically import the official mariadb client
    const mariadb = await import("mariadb");
    this.mariadbModule = mariadb;

    this.pool = mariadb.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port,
      connectionLimit: 5, // reasonable default
    });
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("Database not connected");

    const conn = await this.pool.getConnection();
    try {
      const rows = await conn.query(sql, params);
      return rows;
    } finally {
      conn.release();
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("Database not connected");
    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  async commitTransaction() {
    if (!this.connection) return;
    await this.connection.commit();
    await this.connection.release();
    this.connection = null;
  }

  async rollbackTransaction() {
    if (!this.connection) return;
    await this.connection.rollback();
    await this.connection.release();
    this.connection = null;
  }
}

// Register the MariaDB driver globally
Registry.add("mariadb", MariaDBDriver);
