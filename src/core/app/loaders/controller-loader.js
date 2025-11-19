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
    this.loadedControllers = []; // list of successfully loaded controllers/routes
  }

  /**
   * Loads framework controllers first, then application controllers.
   * Application controllers override framework controllers on same route.
   */
  async load() {
    // 1. Load framework controllers
    await this.#scanFolder(path.join(frameworkRoot, "controllers"), true);

    // 2. Load application controllers
    await this.#scanFolder(appRoot, false);

    // Print loaded controllers summary (single logging)
    if (this.loadedControllers.length > 0) {
      console.log("\n✅ Loaded controllers:");
      this.loadedControllers.forEach(c => {
        console.log(` • Route: ${c.basePath}  (${c.origin}: ${c.file})`);
      });
      console.log("─────────────────────────────────────────────\n");
    }

    // Return as array: [ { path, router }, ... ]
    return [...this.controllers.entries()].map(([path, router]) => ({
      path,
      router,
    }));
  }

  /**
   * Recursively scan for *controller.js/ts files.
   */
  async #scanFolder(folder, isFramework) {
    if (!fs.existsSync(folder)) return;

    const files = fs.readdirSync(folder, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        // Skip node_modules for application scanning
        if (!isFramework && file.name === "node_modules") continue;

        await this.#scanFolder(fullPath, isFramework);
      } else if (file.name.match(/controller\.(js|ts)$/i)) {
        await this.#loadController(fullPath, isFramework);
      }
    }
  }

  /**
   * Load a controller module and build its router.
   */
  async #loadController(fullPath, isFramework) {
    try {
      const mod = await import(nodePathToFileURL(fullPath).href);
      const Controller = mod.default;

      if (!Controller || typeof Controller.route !== "function") {
        console.warn(`⚠️ Skipping invalid controller: ${fullPath}`);
        return;
      }

      const basePath = Controller.route();
      if (typeof basePath !== "string" || !basePath.startsWith("/")) {
        console.warn(
          `⚠️ Invalid route() returned from ${fullPath}: must return something like "/users"`
        );
        return;
      }

      // Build router
      const router = this.#buildRouter(Controller);

      // Application controllers override framework ones
      if (this.controllers.has(basePath) && isFramework) {
        console.log(
          `⚠️ Framework controller overridden by application: ${basePath}`
        );
      }

      this.controllers.set(basePath, router);

      // Store for summary only
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

  /**
   * Build an Express router for the controller using the BaseController convention.
   */
  #buildRouter(Controller) {
    const router = express.Router();

    const handler = method => async (req, res, next) => {
      const instance = new Controller(req, res, next);

      if (typeof instance[method] === "function") {
        try {
          await instance[method]();
        } catch (err) {
          next(err);
        }
      } else {
        res.status(404).send("Not found");
      }
    };

    router.get("/", handler("index"));
    router.get("/:id", handler("show"));
    router.get("/new", handler("new"));
    router.post("/", handler("create"));
    router.get("/:id/edit", handler("edit"));
    router.put("/:id", handler("update"));
    router.delete("/:id", handler("delete"));

    return router;
  }
}
