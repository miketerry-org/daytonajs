// application.js

import fs from "fs";
import path from "path";
import BaseClass from "../base/base-class.js";
import Config from "../utility/config.js";
import TenantManager from "./tenant-manager.js";
import initExpress from "./initExpress.js";

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
  constructor(filename = "config.toml.secret") {
    filename = path.resolve(filename);
    console.log("filename", filename);

    // create a temporary config instance to get server and tenants
    const temp = Config.createFromTOMLFile(filename);

    // Pass server config up to BaseClass
    super(temp.server);

    // Initialize tenant system
    const tenantList = Array.isArray(temp.tenants) ? temp.tenants : [];
    this.tenants = new TenantManager(tenantList);

    // call initialize express function
    initExpress(this);
  }
}
