// tenant-manager.js

import Tenant from "./tenant.js";

/**
 * Manages all tenant instances for the application.
 */
export default class TenantManager {
  #tenantList;

  constructor(tenants = []) {
    this.#tenantList = [];
    tenants.forEach(cfg => {
      this.#tenantList.push(new Tenant(cfg));
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
  addTenant(config) {
    const tenant = new Tenant(config);
    this.#tenantList.push(tenant);
    return tenant;
  }
}
