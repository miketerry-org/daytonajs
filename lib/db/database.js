// database.js

"use strict";

import Base from "../foundation/base.js";
import verify from "../foundation/verify.js";
import Registry from "./registry.js";

// Import drivers so they self-register in the Registry
import "./driverMariaDB.js";
import "./driverMongoDB.js";
import "./driverMySQL.js";
import "./driverPostgres.js";
import "./driverSQLite.js";

/**
 * @class Database
 * @extends Base
 *
 * Provides a unified abstraction layer across multiple SQL and NoSQL databases.
 * Uses the Registry to dynamically load and instantiate the proper driver
 * based on the config’s `DRIVER_NAME`.
 *
 * Handles lazy connection management, delegation, and transaction support.
 */
export default class Database extends Base {
  #driverInstance = null;
  #connectCount = 0;

  verifyConfig(config) {
    const v = verify(config)
      .isString("DRIVER_NAME", true, 1, 20)
      .isString("DATABASE_URI", true, 1, 255);

    if (v.errors.length > 0) {
      throw new Error(
        `Database config validation failed:\n${v.errors.join("\n")}`
      );
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes a connection to the database.
   * Uses reference counting to handle nested connect/disconnect pairs safely.
   */
  async connect() {
    if (this.#connectCount === 0) {
      const { DRIVER_NAME } = this.config;
      const DriverClass = Registry.get(DRIVER_NAME);

      if (!DriverClass) {
        throw new Error(`No database driver registered for '${DRIVER_NAME}'.`);
      }

      const driver = new DriverClass(this.config);
      await driver.connect();
      this.#driverInstance = driver;
    }

    this.#connectCount++;
  }

  /**
   * Disconnects from the database when no more active connect() calls remain.
   */
  async disconnect() {
    if (this.#connectCount > 0) {
      this.#connectCount--;
    }

    if (this.#connectCount === 0 && this.#driverInstance) {
      await this.#driverInstance.disconnect();
      this.#driverInstance = null;
    }
  }

  /**
   * Returns the active driver instance, or throws if not connected.
   * @private
   */
  #driver() {
    if (!this.#driverInstance) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.#driverInstance;
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */
  async insertOne(target, entity) {
    return this.#driver().insertOne(target, entity);
  }

  async insertMany(target, entities) {
    return this.#driver().insertMany(target, entities);
  }

  /* =============================================================
   * Update / Upsert / Delete
   * ============================================================= */
  async updateOne(target, entity) {
    return this.#driver().updateOne(target, entity);
  }

  async updateMany(target, entities) {
    return this.#driver().updateMany(target, entities);
  }

  async upsert(target, entity) {
    return this.#driver().upsert(target, entity);
  }

  async deleteOne(target, entity) {
    return this.#driver().deleteOne(target, entity);
  }

  async deleteMany(target, entities) {
    return this.#driver().deleteMany(target, entities);
  }

  async deleteAll(target) {
    return this.#driver().deleteAll(target);
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */
  async findOne(target, criteria) {
    return this.#driver().findOne(target, criteria);
  }

  async findMany(target, criteria) {
    return this.#driver().findMany(target, criteria);
  }

  async findById(target, id) {
    return this.#driver().findById(target, id);
  }

  async count(target, criteria) {
    return this.#driver().count(target, criteria);
  }

  async exists(target, criteria) {
    return this.#driver().exists(target, criteria);
  }

  /* =============================================================
   * Aggregation / Query
   * ============================================================= */
  async aggregate(target, pipelineOrCriteria) {
    return this.#driver().aggregate(target, pipelineOrCriteria);
  }

  async query(rawQuery, options = {}) {
    return this.#driver().query(rawQuery, options);
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    return this.#driver().startTransaction();
  }

  async commitTransaction() {
    return this.#driver().commitTransaction();
  }

  async rollbackTransaction() {
    return this.#driver().rollbackTransaction();
  }

  async transaction(callback) {
    return this.#driver().transaction(callback);
  }

  /* =============================================================
   * Introspection / Utilities
   * ============================================================= */
  get isConnected() {
    return !!this.#driverInstance;
  }

  get connectionDepth() {
    return this.#connectCount;
  }

  get driverInstance() {
    return this.#driverInstance;
  }

  get driverName() {
    return this.config?.DRIVER_NAME;
  }

  /**
   * Switches to a new driver and reconnects.
   * @param {string} newDriverName
   */
  async switchDriver(newDriverName) {
    if (typeof newDriverName !== "string") {
      throw new TypeError("newDriverName must be a string.");
    }

    if (this.#driverInstance) {
      await this.disconnect();
    }

    this.config.DRIVER_NAME = newDriverName;
    await this.connect();
  }
}
