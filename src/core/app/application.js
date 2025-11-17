// application.js (ESM)

import express from "express";
import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";

export default class Application {
  constructor() {
    this.app = express();
  }

  /**
   * Static async factory method.
   * Creates an Application instance and automatically runs init().
   * @returns {Promise<Application>} Fully initialized Application instance.
   */
  static async create() {
    const instance = new Application();
    await instance.init();
    return instance;
  }

  /**
   * Initializes the application.
   * Loads controllers automatically from the project root.
   * @returns {Promise<express.Application>} The Express application instance.
   */
  async init() {
    await this.#loadControllers(process.cwd());
    return this.app;
  }

  /**
   * Scans for and loads all controllers in the project.
   * A controller must export a default class with a static route(app) method.
   */
  async #loadControllers(rootDir) {
    const controllerFiles = await this.#scanForControllers(rootDir);

    for (const filePath of controllerFiles) {
      try {
        const moduleUrl = pathToFileURL(filePath).href;
        const mod = await import(moduleUrl);

        if (!mod.default || typeof mod.default.route !== "function") {
          console.warn(
            `⚠️ Skipped: ${filePath} (no default export with static route())`
          );
          continue;
        }

        // Register the controller
        mod.default.route(this.app);
        console.log(`Controller registered: ${filePath}`);
      } catch (err) {
        console.error(`❌ Failed to load controller: ${filePath}`, err);
      }
    }
  }

  /**
   * Recursively scans directories for controller files.
   * Matches files ending with "controller.js" or "controller.ts".
   */
  async #scanForControllers(dir) {
    let results = [];

    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        results = results.concat(await this.#scanForControllers(fullPath));
      } else if (
        item.isFile() &&
        (item.name.endsWith("controller.js") ||
          item.name.endsWith("controller.ts"))
      ) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
