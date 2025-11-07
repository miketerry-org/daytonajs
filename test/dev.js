// dev.js:

"use strict";

import Config from "./lib/foundation/config.js";
import env from "./lib/foundation/env.js";
import MongoDBDAO from "./lib/dao/daoMongoDB.js";

let data = {
  serverNode: process.env.SERVER_NODE,
  databaseURI: env.databaseURI,
};

const config = new Config();
config.loadObject(data);
console.log(config);

const dao = new MongoDBDAO(config);

(async () => {
  let client = dao.connect();
  try {
    console.log("hello world!");
  } finally {
    dao.disconnect();
  }
})();
