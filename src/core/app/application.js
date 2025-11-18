// application.js

import ConfigLoader from "./config-loader.js";
import initExpress from "./init-express.js";

export default class Application {
  static instance = null;

  /**
   * Factory method for creating the Application singleton.
   */
  static create() {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  constructor() {
    // Load configuration automatically
    const loader = new ConfigLoader();
    this.config = loader.getConfig();

    // Internal structures
    this.middlewares = []; // array of middleware functions
    this.tenants = this.config.tenants || [];
    this.serverConfig = this.config.server || {};

    // Express app instance (initialized later)
    this.app = null;

    // Initialize express with config and middlewares
    this.initExpress();
  }

  /**
   * Register a middleware function to be applied to Express
   * Must be done before initExpress runs.
   */
  use(middlewareFn) {
    if (typeof middlewareFn !== "function") {
      throw new TypeError("Middleware must be a function");
    }
    this.middlewares.push(middlewareFn);
  }

  /**
   * Initialize the Express app via initExpress()
   */
  initExpress() {
    if (this.app) return; // prevent double initialization

    const options = {
      middlewares: this.middlewares,
      tenants: this.tenants,
      serverConfig: this.serverConfig,
    };

    this.app = initExpress(this.config, options);
  }

  /**
   * Get Express app
   */
  getApp() {
    if (!this.app) {
      throw new Error("Express app is not initialized");
    }
    return this.app;
  }
}
