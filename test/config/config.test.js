// config.test.js:

"use strict";

// load all necessary modules
import Config from "../../src/core/utility/config.js";

// const config = new Config();
// config.loadObject({ message: "hello world" });
const config = Config.createFromObject({ message: "goodbye world" });
console.log(config);
console.log("type", typeof config);
