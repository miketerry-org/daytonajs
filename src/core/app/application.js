// application.js

import initExpress from "./init-express.js";
import ConfigLoader from "./loaders/config-loader.js";
import ControllerLoader from "./loaders/controller-loader.js";
import MiddlewareLoader from "./loaders/middleware-loader.js";

import { registerDefaultDrivers } from "../db/driver-bootstrap.js";
import DriverRegistry from "../db/driver-registry.js";

export default class Application {
  constructor() {
    this.config = null; // Loaded from config.toml.secret
    this.tenants = []; // Array of tenant objects
    this.controllers = []; // Controllers loaded from filesystem
    this.app = null; // Express instance
  }

  /**
   * Main factory method
   */
  static async create() {
    const app = new Application();
    await app.#initialize();
    return app;
  }

  /**
   * Core initialization sequence
   */
  async #initialize() {
    // 1️⃣ Load configuration
    this.config = await this.#loadConfig();
    this.tenants = this.config.tenants || [];

    // 2️⃣ Register built-in DB drivers first
    registerDefaultDrivers();

    // 3️⃣ Allow subclass overrides (optional)
    await this.addCustomDBDrivers(DriverRegistry);

    // 4️⃣ Load controllers
    this.controllers = await this.#loadControllers();

    // 5️⃣ Auto-load middlewares (framework first, then app)
    const autoMiddlewares = await this.#loadMiddlewares();

    // 6️⃣ Build final middleware chain
    const allMiddlewares = [
      ...autoMiddlewares, // Auto-discovered filesystem middleware
      ...(this.config.middlewares || []), // Config-defined middlewares
    ];

    // 7️⃣ Debug logging
    this.#debugListMiddlewares(allMiddlewares);

    // 8️⃣ Create Express app
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
   * Load and decrypt config.toml.secret using ConfigLoader
   */
  async #loadConfig() {
    const loader = new ConfigLoader();
    return await loader.load(); // Always loads project-root/config.toml.secret
  }

  /**
   * Override in subclasses to add custom DB drivers
   */
  async addCustomDBDrivers(registry) {
    // no-op by default
  }

  /**
   * Uses ControllerLoader to scan controllers
   */
  async #loadControllers() {
    const loader = new ControllerLoader();
    return loader.load(); // Framework first, then app
  }

  /**
   * Uses MiddlewareLoader to scan "*-middleware.js/ts" (framework + app)
   */
  async #loadMiddlewares() {
    const loader = new MiddlewareLoader();
    return loader.load(); // Make sure loader is updated to support framework + app
  }

  /**
   * Debug logging of middleware order
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
