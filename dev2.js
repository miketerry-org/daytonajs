"use strict";

import Config from "./lib/foundation/config.js";
import Database from "./lib/db/database.js";
import Registry from "./lib/db/registry.js";

const config = new Config().loadObject({
  DRIVER_NAME: "mongodb",
  DATABASE_URI: "mongodb://localhost:27017/test",
});

(async () => {
  try {
    const db = await Database.create(config);
    try {
      console.log("db", db);
      console.log("connected", db.connected);
      console.log(Registry.list());
    } finally {
      // await db.disconnect();
    }
  } catch (err) {
    console.error(err);
  }
})();
