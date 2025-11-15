// application.js

import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import BaseClass from "../base/base-class.js";
import TenantManager from "./tenant-manager.js";

/**
 * BaseApplication
 *
 * Loads configuration from a TOML file, makes it available via this.config,
 * and initializes tenant management.
 */
export default class BaseApplication extends BaseClass {
  /**
   * @param {string} filename - Path to a TOML configuration file.
   */
  constructor(filename) {
    if (!filename || typeof filename !== "string") {
      throw new Error("BaseApplication constructor requires a TOML filename.");
    }

    const resolved = path.resolve(filename);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Configuration file not found: ${resolved}`);
    }

    const buffer = fs.readFileSync(resolved, "utf8");
    const configs = TOML.parse(buffer);

    if (!configs.server) {
      throw new Error(
        "The TOML configuration file must contain a [server] section."
      );
    }

    // Pass server config up to BaseClass
    super(configs.server);

    // Initialize tenant system
    const tenantList = Array.isArray(configs.tenants) ? configs.tenants : [];

    this.tenants = new TenantManager(tenantList);
  }

  /**
   * App initialization lifecycle hook.
   * Subclasses should override this.
   */
  async init() {
    console.log("🧩 Initializing BaseApplication...");
    console.log(
      `Server config: ${this.config.log_name || "no log_name provided"}`
    );
    console.log(`Loaded ${this.tenants.count} tenant(s).`);
  }
}
