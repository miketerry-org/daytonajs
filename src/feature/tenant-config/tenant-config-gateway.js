// tenant-config-gateway.js:

import TableDataGateway from "../../core/db/table-data-gateway.js";
import tenantConfigSchema from "./tenant-config-schema.js";

export default class tenantConfigGateway extends TableDataGateway {
  constructor(driver, config = {}) {
    super(driver, "tenant_configs", tenantConfigSchema, config);
  }
}
