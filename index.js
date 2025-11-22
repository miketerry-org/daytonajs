// index.js

import env from "./src/core/utility/env.js";
import Application from "./src/core/app/application.js";
import BaseClass from "./src/core/base/base-class.js";
import BaseController from "./src/core/base/base-controller.js";
import BaseDriver from "./src/core/base/base-driver.js";
import ActiveRecord from "./src/core/db/active-record.js";
import TableDataGateway from "./src/core/db/table-data-gateway.js";
import Schema from "./src/core/utility/schema.js";
import ConfigLoader from "./src/core/app/loaders/config-loader.js";

// 3️⃣ Export everything
export {
  ActiveRecord,
  Application,
  env,
  BaseClass,
  BaseController,
  BaseDriver,
  Schema,
  TableDataGateway,
  ConfigLoader,
};
