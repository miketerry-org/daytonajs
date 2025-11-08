// seeder.js:

import Config from "../core/utility/Config.js";
import Mongodriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

async function mainloop() {
  const database_uri = "mongodb://localhost:27017/test";

  const config = Config.createFromObject({ database_uri });

  const driver = new Mongodriver(config);

  try {
    await driver.connect();

    const model = new ServerConfigModel(driver);
  } catch (err) {
    throw err;
  } finally {
    await driver.disconnect();
  }
}

await mainloop();
