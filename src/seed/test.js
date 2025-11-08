// test.js:

import Config from "../core/utility/config.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

const config = Config.createFromObject({
  db_uri: "mongodb://localhost:27017/test",
});

// instanciate a new MongoDB driver
const driver = new MongoDBDriver(config);
console.log("driver", driver);
process.exit(0);

// instanciate server config model
const model = new ServerConfigModel(driver);

console.log("before");
model.nodeId = 1;
model.httpPort = 3000;
model.db_uri = "mongodb://localhost:27017/test";
model.log_name = "logs";
console.log("model", model);
console.log("after");
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
