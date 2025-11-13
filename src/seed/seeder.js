import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import Config from "../core/utility/Config.js";
import ServerConfigGateway from "../feature/server-config/server-config-gateway.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";

function loadConfigs() {
  const filename = path.resolve("src/seed/configs.toml");
  const buffer = fs.readFileSync(filename, "utf8");
  const data = TOML.parse(buffer);
  return {
    server: Config.createFromObject(data.server),
    tenants: Config.createFromArray(data.tenants),
  };
}

const configs = loadConfigs();
console.log("configs", configs);

async function mainloop() {
  const driver = new MongoDBDriver(config.server);

  try {
    await driver.connect();

    // Ensure you pass the actual client or connection object expected by your model
    const model = new ServerConfigGateway(driver);

    // delete any records from previous run
    await model.deleteMany();

    const data = await model.insertOne(config, { returnFull: true });
  } catch (err) {
    console.error("Seeder error:", err);
    throw err; // <-- fixed Err -> err
  } finally {
    await driver.disconnect();
  }
}

await mainloop();
