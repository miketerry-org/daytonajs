// tenant.js:

import BaseClass from "../base/base-class.js";

/**
 * Represents a single tenant, with config accessed through this.config.
 */
export default class Tenant extends BaseClass {
  constructor(config = {}) {
    super(config);
  }

  verifyConfig(config) {
    // You may define tenant-specific validation rules here.
    return null;
  }
}
