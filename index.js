// index.js

// this must be first import to initialize runtime environment variables
import system from "./src/core/utility/system.js";
import "./src/core/utility/verbose.js";

import ActiveRecord from "./src/core/db/active-record.js";
import Application from "./src/core/app/application.js";
import BaseClass from "./src/core/base/base-class.js";
import BaseController from "./src/core/base/base-controller.js";
import BaseDriver from "./src/core/base/base-driver.js";
import ConfigLoader from "./src/core/app/loaders/config-loader.js";
import Schema from "./src/core/utility/schema.js";
import TableDataGateway from "./src/core/db/table-data-gateway.js";

// 3️⃣ Export everything
export {
  ActiveRecord,
  Application,
  BaseClass,
  BaseController,
  BaseDriver,
  ConfigLoader,
  Schema,
  system,
  TableDataGateway,
};
