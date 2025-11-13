import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import Config from "../core/utility/Config.js";
import ServerConfigGateway from "../feature/server-config/server-config-gateway.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";

function loadServerConfig() {
  const filename = path.resolve("src/seed/configs.toml");
  const buffer = fs.readFileSync(filename, "utf8");
  const data = TOML.parse(buffer);
  return Config.createFromObject(data.server);
}

async function mainloop() {
  const config = loadServerConfig();
  const driver = new MongoDBDriver(config);

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
