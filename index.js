// import "./src/internal/utility/short-stack.js";
import "./src/global/system.js";
import LoggerFactory from "./src/external/logger/logger-factory.js";
import DriverRegistry from "./src/internal/database/driver-registry.js";
import BetterSqliteDriver from "./src/internal/database/better-sqlite-driver.js";
import LibSqlDriver from "./src/internal/database/libsql-driver.js";
import MariaDBDriver from "./src/internal/database/mariadb-driver.js";
import MongodbDriver from "./src/internal/database/mongodb-driver.js";

async function main() {
  // console.log("production", system.isProduction);
  // console.log("development", system.isDevelopment);
  // console.log("tenants", system.config.tenants.length);
  // system.log = LoggerFactory.createLogger(system.config.server.log_type);
  // system.log.info("greeting", "hello Michael!");

  // const driver = new BetterSqliteDriver();
  // const driver = new LibSqlDriver();
  const driver = new MariaDBDriver();
}

main();
