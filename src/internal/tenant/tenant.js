// tenant.js

import BaseClass from "../base/base-class.js";
import DriverRegistry from "../core/driver-registry.js";

export default class Tenant extends BaseClass {
  #driverClass = null;
  #driverInstance = null;

  constructor(config = {}, modelClasses = []) {
    super(config);

    // 1️⃣ Lookup the driver class immediately
    if (!config.database_driver) {
      throw new Error(`Tenant is missing required config: database_driver`);
    }
    this.#driverClass = DriverRegistry.get(config.database_driver);

    // 2️⃣ Store loaded model classes
    this._modelClasses = modelClasses;

    // 3️⃣ Will hold tenant-specific model instances
    this.models = {};
  }

  /**
   * Returns the driver instance.
   * Lazily instantiates and connects on first access.
   */
  get db() {
    if (!this.#driverInstance) {
      this.#driverInstance = new this.#driverClass(this.config);
    }

    if (!this.#driverInstance.isConnected) {
      this.#driverInstance.connect();
    }

    return this.#driverInstance;
  }

  /**
   * Lazy-instantiate tenant-specific models
   * Each model receives this tenant's driver instance
   */
  initializeModels() {
    for (const { name, class: ModelClass } of this._modelClasses) {
      // Use lowercase keys for convenience: tenant.models.user
      const key = name.toLowerCase();
      if (this.models[key]) {
        throw new Error(
          `Tenant models already contain a model with name "${key}"`
        );
      }
      this.models[key] = new ModelClass(this.db);
    }
  }

  /**
   * Optional: tenant-specific config validation
   */
  verifyConfig(config) {
    // Add tenant-specific validation rules here if needed
    return null;
  }
}
