// application.js

import System from "./system.js";
import initExpress from "../utility/init-express.js";
import ConfigLoader from "../loader/config-loader.js";
import ControllerLoader from "../loader/controller-loader.js";
import DriverLoader from "../loader/driver-loader.js";
import MiddlewareLoader from "../loader/middleware-loader.js";
import ModelLoader from "../loader/model-loader.js";
import system from "./system.js";

export default class Application {
  constructor() {
    this.config = null; // Loaded from config.toml.secret
    this.tenants = []; // Tenant definitions from config
    this.controllers = []; // Loaded controllers (path + router)
    this.app = null; // Final Express instance
    this.models = []; // Loaded model classes, shared for all tenants
  }

  /**
   * Factory creator
   */
  static async create() {
    const app = new Application();
    await app.#initialize();
    return app;
  }

  /**
   * Core boot sequence
   */
  async #initialize() {
    // 1️⃣ Load project config
    this.config = await this.#loadConfig();
    this.tenants = this.config.tenants || [];

    // 2️⃣ Auto-discover database drivers (framework → app)
    await this.#loadDatabaseDrivers();

    // 2.5️⃣ Load all model classes (framework → app)
    const modelLoader = new ModelLoader();
    this.models = await modelLoader.load();

    // 3️⃣ Discover controllers (framework → app)
    this.controllers = await this.#loadControllers();

    // 4️⃣ Auto-discover middlewares (framework → app)
    const autoMiddlewares = await this.#loadMiddlewares();

    // 5️⃣ Merge config middlewares
    const allMiddlewares = [
      ...autoMiddlewares,
      ...(this.config.middlewares || []),
    ];

    try {
      this.app = await initExpress({
        middlewares: allMiddlewares,
        routers: this.controllers,
      });
    } catch (err) {
      system.log.error("❌ Failed to initialize Express app");
      throw err;
    }
  }

  /**
   * Auto-discovers DB drivers via DriverLoader
   */
  async #loadDatabaseDrivers() {
    const loader = new DriverLoader();
    await loader.load(); // registers everything into DriverRegistry
  }

  /**
   * Auto-discover controllers
   */
  async #loadControllers() {
    const loader = new ControllerLoader();
    return loader.load();
  }

  /**
   * Auto-discover middlewares
   */
  async #loadMiddlewares() {
    const loader = new MiddlewareLoader();
    return loader.load();
  }

  start() {
    const port = System.config.server.getInteger("http_port", 3000);
    this.app.listen(port, () => {
      console.log("system", system);
      system.log.info(`listening on port ${port}`);
    });
  }
}
