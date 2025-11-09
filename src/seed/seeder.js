// seeder.js:

import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import Config from "../core/utility/Config.js";
import Mongodriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

function loadServerConfig() {
  const filename = path.resolve("src/seed/configs.toml");
  const buffer = fs.readFileSync(filename, "utf8");
  const data = TOML.parse(buffer);
  return Config.createFromObject(data.server);
}

async function mainloop() {
  const config = loadServerConfig();
  const driver = new Mongodriver(config);

  console.log("config", config);
  try {
    await driver.connect();

    const model = new ServerConfigModel(driver);
    await model.insertOne(config);
    console.log("after", model.node_id);
    console.log("count", await model.count());
  } catch (err) {
    console.error("Seeder error:", err);
  } finally {
    await driver.disconnect();
  }
}

await mainloop();
