// driverMysql.js

"use strict";

import verify from "../foundation/verify.js";
import SQLDriver from "./driverSQL.js";
import Registry from "./registry.js";

export default class MySQLDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    this.pool = null;
    this.connection = null; // for transaction use
    this.mysqlModule = null;

    this.config = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ?? 3306,
    };
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
    return "mysql";
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) {
      return;
    }

    // dynamically import mysql2/promise
    const mysql = await import("mysql2/promise");
    this.mysqlModule = mysql;

    this.pool = await mysql.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port,
      // you can also include other pooling options if desired, e.g.
      connectionLimit: 5,
    });
  }

  async disconnect() {}

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) {
      throw new Error("Database not connected");
    }
    const [rows] = await this.pool.execute(sql, params);
    return rows;
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

// register the MySQL database driver
Registry.add("mysql", MySQLDriver);
