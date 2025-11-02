// mariadb-driver.js

"use strict";

import verify from "../../utility/verify.js";
import SQLDriver from "./sql-driver.js";
import DriverRegistry from "../driver-registry.js";

export default class MariaDBDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.pool = null;
    this.connection = null;
  }

  async destructor() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  verifyConfig(config) {
    return verify(config)
      .isString("host", true, 1, 255)
      .isString("user", true, 1, 255)
      .isString("password", true, 1, 255)
      .isString("database", true, 1, 255)
      .isInteger("port", true, 1, 65000, 3306);
  }

  static driverName() {
    return "mariadb";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) {
      return;
    }

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

  async disconnect() {}

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
DriverRegistry.add("mariadb", MariaDBDriver);
