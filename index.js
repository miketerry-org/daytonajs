import "./src/internal/utility/short-stack.js";
import "./src/global/system.js";

async function main() {
  console.log("production", system.isProduction);
  console.log("development", system.isDevelopment);
  console.log("config", system.config);
  console.log("tenants", system.config.tenants.length);
}

main();
