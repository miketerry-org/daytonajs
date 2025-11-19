// application.js

import initExpress from "./init-express.js";
import ConfigLoader from "./loaders/config-loader.js";
import ControllerLoader from "./loaders/controller-loader.js";
import DriverLoader from "./loaders/driver-loader.js";
import MiddlewareLoader from "./loaders/middleware-loader.js";

export default class Application {
  constructor() {
    this.config = null; // Loaded from config.toml.secret
    this.tenants = []; // Tenant definitions from config
    this.controllers = []; // Loaded controllers (path + router)
    this.app = null; // Final Express instance
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

    // 3️⃣ Discover controllers (framework → app)
    this.controllers = await this.#loadControllers();

    // 4️⃣ Auto-discover middlewares (framework → app)
    const autoMiddlewares = await this.#loadMiddlewares();

    // 5️⃣ Merge config middlewares
    const allMiddlewares = [
      ...autoMiddlewares,
      ...(this.config.middlewares || []),
    ];

    // 6️⃣ Debug output
    this.#debugListMiddlewares(allMiddlewares);

    // 7️⃣ Build Express app
    try {
      this.app = await initExpress({
        config: this.config,
        middlewares: allMiddlewares,
        routers: this.controllers,
      });
    } catch (err) {
      console.error("❌ Failed to initialize Express app");
      throw err;
    }
  }

  /**
   * Load config.toml.secret via the ConfigLoader
   */
  async #loadConfig() {
    const loader = new ConfigLoader();
    return await loader.load();
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

  /**
   * Debug print middleware order
   */
  #debugListMiddlewares(allMiddlewares) {
    if (!this.config.debug) return;

    console.log("─────────────────────────────────────────────");
    console.log("🧩  Express Middleware Load Order (Debug Mode)");
    console.log("─────────────────────────────────────────────");

    allMiddlewares.forEach((mw, i) => {
      const name = mw.name || "(anonymous middleware)";
      console.log(`${String(i + 1).padStart(2, "0")}. ${name}`);
    });

    console.log("─────────────────────────────────────────────");
  }
}
