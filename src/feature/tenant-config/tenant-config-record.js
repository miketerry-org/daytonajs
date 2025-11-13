// tenant-config-record.js

import ActiveRecord from "../../core/db/active-record.js";
import TenantConfigSchema from "./tenant-config-schema.js";

export default class tenantConfigRecord extends ActiveRecord {
  constructor(driver, config = {}) {
    super(driver, "tenant_configs", tenantConfigSchema, config);
  }
}
