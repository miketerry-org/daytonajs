// tenant-manager.js

import Tenant from "./tenant.js";

/**
 * Manages all tenant instances for the application.
 */
export default class TenantManager {
  #tenantList;

  /**
   * @param tenants Array of tenant configs
   * @param modelClasses Array of loaded model classes from ModelLoader
   */
  constructor(tenants = [], modelClasses = []) {
    this.#tenantList = [];

    tenants.forEach(cfg => {
      // Pass shared model classes to each tenant
      const tenant = new Tenant(cfg, modelClasses);
      tenant.initializeModels(); // populate tenant.models
      this.#tenantList.push(tenant);
    });
  }

  get count() {
    return this.#tenantList.length;
  }

  /**
   * Returns a read-only copy of all tenants.
   */
  get all() {
    return [...this.#tenantList];
  }

  /**
   * Finds a tenant by its domain (tenant.config.domain).
   */
  findByDomain(domain) {
    if (!domain) return null;
    return this.#tenantList.find(t => t.config?.domain === domain) || null;
  }

  /**
   * Adds a new tenant at runtime.
   */
  addTenant(config, modelClasses = []) {
    const tenant = new Tenant(config, modelClasses);
    tenant.initializeModels();
    this.#tenantList.push(tenant);
    return tenant;
  }
}
