14;
import fs from "fs";
import path from "path";
import BaseApplication from "../core/base/base-application.js";

class Application extends BaseApplication {}

const app = Application.createFromFile("./src/seed/configs.toml");
console.log("tenants", app.tenants.count);
