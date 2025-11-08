// test2.js:

import Config from "../core/utility/Config.js";
import MongoDBDriver from "../core/db/drivers/mongodb-driver.js";
console.log("hello world");

const config = Config.createFromObject({
  database_uri: "mongodb://localhost:27017/test",
});
console.log(config);

const driver = new MongoDBDriver(config);
console.log(driver);
