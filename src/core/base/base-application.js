// base-application.js

import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import BaseClass from "./base-class.js";

/**
 * Represents a single tenant configuration instance.
 * Extends BaseClass for consistent lifecycle and utility support.
 */
class Tenant extends BaseClass {
  constructor(config = {}) {
    super(config);
  }
}

/**
 * Manages all tenant instances for the application.
 */
class TenantManager {
  #tenantList = [];

  constructor(tenants = []) {
    tenants.forEach(t => {
      this.#tenantList.push(new Tenant(t));
    });
  }

  get count() {
    return this.#tenantList.length;
  }

  /**
   * Returns the internal tenant array (read-only).
   */
  get all() {
    return [...this.#tenantList];
  }

  /**
   * Finds a tenant by its domain name.
   * @param {string} domain
   * @returns {Tenant|null}
   */
  findByDomain(domain) {
    if (!domain) {
      return null;
    }

    return this.#tenantList.find(t => t.domain === domain) || null;
  }

  /**
   * Adds a new tenant dynamically at runtime.
   */
  addTenant(config) {
    const tenant = new Tenant(config);
    this.#tenantList.push(tenant);
    return tenant;
  }
}

/**
 * BaseApplication
 *
 * Encapsulates the server configuration, tenant manager, and
 * provides an extendable base for application startup logic.
 */
export default class BaseApplication extends BaseClass {
  constructor(serverConfig = {}, tenantConfigList = []) {
    super(serverConfig);

    if (!serverConfig || typeof serverConfig !== "object") {
      throw new Error("BaseApplication requires a valid serverConfig object.");
    }

    this.serverConfig = serverConfig;
    this.tenants = new TenantManager(tenantConfigList);
  }

  /**
   * Creates an application instance from a TOML configuration file.
   * The file must define `[server]` and `[[tenants]]` sections.
   *
   * @param {string} filename - Path to the TOML file.
   * @returns {BaseApplication} instance
   */
  static createFromFile(filename) {
    filename = path.resolve(filename);

    if (!fs.existsSync(filename)) {
      throw new Error(`Configuration file not found: ${filename}`);
    }

    const buffer = fs.readFileSync(filename, "utf8");
    const configs = TOML.parse(buffer);

    if (!configs.server) {
      throw new Error("Missing [server] section in configuration file.");
    }

    const tenantList = Array.isArray(configs.tenants) ? configs.tenants : [];

    return new this(configs.server, tenantList);
    1;
  }

  /**
   * Example initialization lifecycle method.
   * Extend this in subclasses.
   */
  async init() {
    console.log("🧩 Initializing BaseApplication...");
    console.log(`Server config loaded: ${this.serverConfig.log_name || "N/A"}`);
    console.log(`Loaded ${this.tenants.count} tenant(s).`);
  }
}
