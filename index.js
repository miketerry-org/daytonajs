// index.js:

// import these modules to export classes
import Config from "./src/core/utility/config.js";
import Application from "./src/core/app/application.js";
import BaseClass from "./src/core/base/base-class.js";
import BaseDriver from "./src/core/base/base-driver.js";
import ActiveRecord from "./src/core/db/active-record.js";
import TableDataGateway from "./src/core/db/table-data-gateway.js";

// import these modules to cause automatic registration of database drivers
import MariaDBDriver from "./src/core/db/drivers/mariadb-driver.js";
import MongoDBDriver from "./src/core/db/drivers/mongodb-driver.js";
import MySqlDriver from "./src/core/db/drivers/mysql-driver.js";
import PostgresDriver from "./src/core/db/drivers/postgres-driver.js";
import SqliteDriver from "./src/core/db/drivers/sqlite-driver.js";

export {
  ActiveRecord,
  Application,
  Config,
  BaseClass,
  BaseDriver,
  TableDataGateway,
};
