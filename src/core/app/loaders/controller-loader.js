// controller-loader.js

import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath, pathToFileURL as nodePathToFileURL } from "url";

/**
 * Resolve framework root (root of daytona-mvc package)
 */
const __filename = fileURLToPath(import.meta.url);
const frameworkRoot = path.resolve(__filename, "../../..");

/**
 * Application root
 */
const appRoot = process.cwd();

export default class ControllerLoader {
  constructor() {
    this.controllers = new Map(); // key = basePath, value = router
    this.loadedControllers = []; // list of successfully loaded controllers
    this.routeRegistry = new Map(); // key = fullRoute ("GET /users"), value = controller file
  }

  // ================================================================
  // Public: Load all controllers (framework first, then app)
  // ================================================================
  async load() {
    await this.#scanFolder(path.join(frameworkRoot, "controllers"), true);
    await this.#scanFolder(appRoot, false);

    this.#printControllerSummary();
    return [...this.controllers.entries()].map(([path, router]) => ({
      path,
      router,
    }));
  }

  // ================================================================
  // Scan folders for *controller.js/ts files
  // ================================================================
  async #scanFolder(folder, isFramework) {
    if (!fs.existsSync(folder)) return;

    const files = fs.readdirSync(folder, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        if (!isFramework && file.name === "node_modules") continue;
        await this.#scanFolder(fullPath, isFramework);
      } else if (file.name.match(/controller\.(js|ts)$/i)) {
        await this.#loadController(fullPath, isFramework);
      }
    }
  }

  // ================================================================
  // Load a controller file and register its router
  // ================================================================
  async #loadController(fullPath, isFramework) {
    try {
      const mod = await import(nodePathToFileURL(fullPath).href);
      const Controller = mod.default;

      // Validate interface
      if (
        !Controller ||
        typeof Controller.route !== "function" ||
        typeof Controller.routes !== "function"
      ) {
        console.warn(
          `⚠️ Skipping invalid controller: ${fullPath} (must implement static route() and static routes(router))`
        );
        return;
      }

      const basePath = Controller.route();

      if (typeof basePath !== "string" || !basePath.startsWith("/")) {
        console.warn(
          `⚠️ Invalid route() in ${fullPath}: must return '/example'`
        );
        return;
      }

      const router = this.#buildRouter(Controller, fullPath, basePath);

      // Framework controllers can be overridden by app controllers
      if (this.controllers.has(basePath) && isFramework) {
        console.log(
          `⚠️ Framework controller overridden by application: ${basePath}`
        );
      }

      this.controllers.set(basePath, router);

      this.loadedControllers.push({
        basePath,
        file: fullPath,
        origin: isFramework ? "framework" : "app",
      });
    } catch (err) {
      console.error(`❌ Failed to load controller: ${fullPath}`);
      console.error(err);
    }
  }

  // ================================================================
  // Build router for a controller + provide route introspection & logging
  // ================================================================
  #buildRouter(Controller, filePath, basePath) {
    const router = express.Router();
    const original = router.use.bind(router);

    // Wrap router methods for introspection + conflict detection
    const methodsToWrap = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "options",
      "head",
      "all",
    ];

    for (const method of methodsToWrap) {
      const originalMethod = router[method].bind(router);

      router[method] = (route, ...handlers) => {
        this.#registerRouteBinding(
          method.toUpperCase(),
          basePath + route,
          filePath
        );
        return originalMethod(route, ...handlers);
      };
    }

    // Allow nested routers (if controller wants to mount middleware inside)
    router.use = (...args) => {
      this.#registerRouteBinding("USE", basePath + "/*", filePath);
      return original(...args);
    };

    // Let controller define its routes
    try {
      Controller.routes(router);
    } catch (err) {
      console.error(`❌ Error in ${Controller.name}.routes():`);
      console.error(err);
    }

    return router;
  }

  // ================================================================
  // Register route for conflict detection + logging
  // ================================================================
  #registerRouteBinding(method, fullRoute, filePath) {
    const key = `${method} ${fullRoute}`;

    if (this.routeRegistry.has(key)) {
      console.error(`\n❌ ROUTE CONFLICT DETECTED`);
      console.error(`   Route: ${key}`);
      console.error(`   First defined in: ${this.routeRegistry.get(key)}`);
      console.error(`   Conflicting file: ${filePath}`);
      console.error("─────────────────────────────────────────────\n");
    } else {
      this.routeRegistry.set(key, filePath);
      console.log(`📌 Route registered: ${key}   →   ${filePath}`);
    }
  }

  // ================================================================
  // Print summary of all loaded controllers
  // ================================================================
  #printControllerSummary() {
    if (this.loadedControllers.length === 0) return;

    console.log("\n✅ Loaded controllers:");
    this.loadedControllers.forEach(c => {
      console.log(` • Route: ${c.basePath}  (${c.origin}: ${c.file})`);
    });
    console.log("─────────────────────────────────────────────\n");
  }

  // ================================================================
  // Public API: Introspection Tooling
  // ================================================================
  listControllers() {
    return this.loadedControllers.map(c => ({
      route: c.basePath,
      file: c.file,
      origin: c.origin,
    }));
  }

  listRoutes() {
    return [...this.routeRegistry.entries()].map(([key, file]) => ({
      route: key,
      definedIn: file,
    }));
  }

  controllerForRoute(method, path) {
    const key = `${method.toUpperCase()} ${path}`;
    return this.routeRegistry.get(key) || null;
  }
}
