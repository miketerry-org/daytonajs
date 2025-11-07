// seeder.js:

import Config from "../core/utility/config.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

// initialize configuration object for MongoDB driver
const config = new Config();
config.node_id = 1;
config.httpPort = 3000;
config.db_uri = "mongodb://localhost:27017/test";

console.log(config);
// process.exit(0);

// instanciate a new MongoDB driver
const driver = new MongoDBDriver(config);
console.log("driver", driver);

// instanciate server config model
const model = new ServerConfigModel(driver);

model.nodeId = 1;
model.httpPort = 3000;
model.database = "mongodb://localhost:27017/test";
console.log("model", model);
process.exit(0);

async function mainLoop() {
  await driver.connect();

  try {
  } catch (err) {
  } finally {
    await driver.disconnect();
  }
}

await mainLoop();
