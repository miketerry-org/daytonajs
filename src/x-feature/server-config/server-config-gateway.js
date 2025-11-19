// server-config-gateway.js:

import TableDataGateway from "../../core/db/table-data-gateway.js";
import serverConfigSchema from "./server-config-schema.js";

export default class ServerConfigGateway extends TableDataGateway {
  constructor(driver, config = {}) {
    super(driver, "server_configs", serverConfigSchema, config);
  }
}
