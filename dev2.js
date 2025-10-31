"use strict";

import Config from "./lib/foundation/config.js";
import Database from "./lib/db/database.js";
import Registry from "./lib/db/registry.js";

const config = new Config().loadObject({
  DRIVER_NAME: "mongodb",
  DATABASE_URI: "mongodb://localhost:27017/test",
});
console.log(config);

const db = new Database(config);

(async () => {
  try {
    await db.connect();
    try {
      console.log(Registry.list());
    } finally {
      await db.disconnect();
    }
  } catch (err) {
    console.error(err);
  }
})();
