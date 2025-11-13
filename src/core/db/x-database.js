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
 * You may either construct and manage connection manually, or use the
 * static `create` method to both instantiate and connect in one step.
 */
export default class Database extends Base {
  #driverInstance = null;
  #connectCount = 0;

  /**
   * Constructs a new Database instance but does *not* connect.
   * Use `await Database.create(config)` if you want an already‐connected instance.
   *
   * @param {Object} config – Configuration object with at least DRIVER_NAME and driver-specific settings.
   */
  constructor(config) {
    super(config);
    // No automatic connect in constructor
  }

  /**
   * Creates a new Database instance *and* connects to the database.
   *
   * Example:
   * ```js
   * const db = await Database.create({ DRIVER_NAME: "mysql", host: "...", user: "...", database: "...", port: 3306 });
   * ```
   *
   * @param {Object} config – Configuration object including DRIVER_NAME and driver specific settings.
   * @returns {Promise<Database>} A Database instance connected and ready to use.
   * @throws {Error} if connection fails or driver not found.
   */
  static async create(config) {
    const instance = new Database(config);
    await instance.connect();
    return instance;
  }

  /**
   * Validates the configuration object.
   *
   * @param {Object} config – Configuration to validate.
   * @throws {Error} if config is invalid.
   */
  verifyConfig(config) {
    const v = verify(config)
      .isString("DRIVER_NAME", true, 1, 20)
      .isString("DATABASE_URI", true, 1, 255);
    // Note: removed AUTO_CONNECT check because we no longer support it
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
   *
   * @returns {Promise<void>}
   * @throws {Error} if driver not registered or connection fails.
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
   *
   * @returns {Promise<void>}
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
   * Returns true if connected (i.e., driver instance created).
   *
   * @returns {boolean}
   */
  get connected() {
    return !!this.#driverInstance;
  }

  /**
   * Returns how many times connect() has been called minus disconnect() calls.
   *
   * @returns {number}
   */
  get connectionDepth() {
    return this.#connectCount;
  }

  /**
   * Returns the active driver instance, or throws if not connected.
   *
   * @private
   */
  #driver() {
    if (!this.#driverInstance) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.#driverInstance;
  }

  /* =============================================================
   * Create / Insert / Update / Delete / Query operations
   * ============================================================= */

  async insertOne(target, entity) {
    return this.#driver().insertOne(target, entity);
  }

  async insertMany(target, entities) {
    return this.#driver().insertMany(target, entities);
  }

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

  async aggregate(target, pipelineOrCriteria) {
    return this.#driver().aggregate(target, pipelineOrCriteria);
  }

  async query(rawQuery, options = {}) {
    return this.#driver().query(rawQuery, options);
  }

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

  /**
   * Returns the underlying driver instance.
   *
   * @returns {Object|null} The driver instance or null if not connected.
   */
  get driverInstance() {
    return this.#driverInstance;
  }

  /**
   * Returns the configured driver name.
   *
   * @returns {string|undefined}
   */
  get driverName() {
    return this.config?.DRIVER_NAME;
  }

  /**
   * Switches to a new driver and reconnects.
   *
   * @param {string} newDriverName – Name of the driver to switch to (must be registered).
   * @returns {Promise<void>}
   * @throws {TypeError} if newDriverName is not string.
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
