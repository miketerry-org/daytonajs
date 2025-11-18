// tenant.js

import BaseClass from "../base/base-class.js";
import DriverRegistry from "../core/driver-registry.js";

export default class Tenant extends BaseClass {
  #driverClass = null;
  #driverInstance = null;

  constructor(config = {}) {
    super(config);

    // 1️⃣ Lookup the driver class immediately (cheap)
    if (!config.database_driver) {
      throw new Error(`Tenant is missing required config: database_driver`);
    }

    this.#driverClass = DriverRegistry.get(config.database_driver);
  }

  /**
   * Returns the driver instance.
   * Lazily instantiates and connects on first access.
   */
  get db() {
    // 2️⃣ Instantiate driver lazily
    if (!this.#driverInstance) {
      this.#driverInstance = new this.#driverClass(this.config);
    }

    // 3️⃣ Connect if not already connected
    if (!this.#driverInstance.isConnected) {
      // assume driver.connect() returns a promise or handles internal state
      this.#driverInstance.connect();
    }

    return this.#driverInstance;
  }

  verifyConfig(config) {
    // Tenant-specific validation rules here.
    return null;
  }
}
