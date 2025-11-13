// server-config-record.js

import ActiveRecord from "../../core/db/active-record.js";
import serverConfigSchema from "./server-config-schema.js";

export default class ServerConfigRecord extends ActiveRecord {
  constructor(driver, config = {}) {
    super(driver, "server_configs", serverConfigSchema, config);
  }
}
