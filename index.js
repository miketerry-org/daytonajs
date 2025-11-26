import "./src/internal/utility/short-stack.js";
import "./src/global/system.js";
import LoggerFactory from "./src/external/logger/logger-factory.js";

async function main() {
  console.log("production", system.isProduction);
  console.log("development", system.isDevelopment);
  // console.log("config", system.config);
  console.log("tenants", system.config.tenants.length);
  system.log = LoggerFactory.createLogger(system.config.server.log_type);
  system.log.info("greeting", "hello Michael!");
}

main();
