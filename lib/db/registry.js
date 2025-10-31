// registry.js

"use strict";

export default class Registry {
  // Private static Map to hold all registered drivers
  static #drivers = new Map();

  /**
   * Registers a driver by name.
   * If a driver with the same name already exists, it is replaced.
   *
   * @param {string} driverName - The unique name for the driver.
   * @param {Function} DriverClass - The driver constructor or class.
   */
  static add(driverName, DriverClass) {
    if (typeof driverName !== "string") {
      throw new TypeError("driverName must be a string.");
    }
    if (typeof DriverClass !== "function") {
      throw new TypeError("DriverClass must be a constructor or class.");
    }

    // Replace existing entry (Map handles this automatically)
    this.#drivers.set(driverName, DriverClass);
  }

  /**
   * Retrieves a registered driver class by name.
   *
   * @param {string} driverName - The name of the driver to retrieve.
   * @returns {Function} The registered driver class.
   * @throws {Error} If no driver is registered under the given name.
   */
  static get(driverName) {
    if (typeof driverName !== "string") {
      throw new TypeError("driverName must be a string.");
    }

    if (!this.#drivers.has(driverName)) {
      throw new Error(`No database driver registered with name: ${driverName}`);
    }

    return this.#drivers.get(driverName);
  }

  /**
   * Lists all registered driver names.
   *
   * @returns {string[]} Array of driver names.
   */
  static list() {
    return Array.from(this.#drivers.keys());
  }

  /**
   * Removes a driver from the registry.
   * (Optional convenience method)
   *
   * @param {string} driverName - The driver name to remove.
   * @returns {boolean} True if removed, false if not found.
   */
  static remove(driverName) {
    return this.#drivers.delete(driverName);
  }
}
