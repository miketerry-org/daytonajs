// application.js

import ConfigLoader from "./config-loader.js";
import initExpress from "./init-express.js";
import ControllerLoader from "./controller-loader.js";
import tenantMiddleware from "./tenant-middleware.js";

export default class Application {
  static instance;

  static create() {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  constructor() {
    if (Application.instance) return Application.instance;

    this.config = this.#loadConfig();
    this.controllers = this.#loadControllers();
    this.app = this.#initExpress();

    Application.instance = this;
  }

  #loadConfig() {
    const key = process.env.CONFIG_KEY;
    if (!key) throw new Error("CONFIG_KEY environment variable required");
    const loader = new ConfigLoader("config.toml.secret", key);
    return loader.load();
  }

  #loadControllers() {
    const loader = new ControllerLoader();
    return loader.load();
  }

  #initExpress() {
    const middlewares = [
      tenantMiddleware(this.config.tenants), // tenant middleware first
      ...(this.config.middlewares || []), // additional middlewares if any
    ];

    return initExpress({
      middlewares,
      routers: this.controllers,
    });
  }
}
