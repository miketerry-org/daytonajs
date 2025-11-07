// seeder.js:

"use strict";

import Config from "../core/utility/config.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

// initialize configuration object for MongoDB driver
const config = Config.createFromObject({
  database_uri: "mongodb://localhost:27017/dev",
});
console.log(config);
// process.exit(1);

// instanciate a new MongoDB driver
const driver = new MongoDBDriver(config);
console.log("driver", driver);

// instanciate server config model
const model = new ServerConfigModel(driver);

model.nodeId = 1;
model.httpPort = 3000;
console.log("model", model);

async function mainLoop() {
  await driver.connect();

  try {
  } catch (err) {
  } finally {
    await driver.disconnect();
  }
}

await mainLoop();
