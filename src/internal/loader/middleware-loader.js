// middleware-loader.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Resolve framework root (root of daytona-mvc package)
 */
const __filename = fileURLToPath(import.meta.url);
const frameworkRoot = path.resolve(__filename, "../../..");

/**
 * Application root
 */
const appRoot = process.cwd();

/**
 * MiddlewareLoader
 * -----------------
 * Recursively loads all "*-middleware.js" or "*-middleware.ts" files.
 * Framework middlewares are loaded first, then application middlewares.
 *
 * Middleware filenames can use 3-digit prefixes to enforce order:
 *  e.g., 001-auth-middleware.js, 010-logger-middleware.js
 */
export default class MiddlewareLoader {
  constructor() {
    this.middlewares = [];
  }

  /**
   * Load all middlewares asynchronously
   * @returns {Promise<Function[]>} array of middleware functions
   */
  async load() {
    // 1️⃣ Load framework middlewares
    await this.#scanFolder(path.join(frameworkRoot, "middlewares"), true);

    // 2️⃣ Load application middlewares
    await this.#scanFolder(appRoot, false);

    // 3️⃣ Sort by 3-digit filename prefix if present
    this.middlewares.sort((a, b) => a.__order - b.__order);

    // Remove temporary __order property before returning
    return this.middlewares.map(mw => {
      delete mw.__order;
      return mw;
    });
  }

  /**
   * Recursively scan folder for *-middleware.js/ts files
   * @param {string} folder
   * @param {boolean} isFramework
   */
  async #scanFolder(folder, isFramework) {
    if (!fs.existsSync(folder)) return;

    const files = fs.readdirSync(folder, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        // Skip node_modules only in application scanning
        if (!isFramework && file.name === "node_modules") continue;

        await this.#scanFolder(fullPath, isFramework);
        continue;
      }

      if (!file.name.match(/-middleware\.(js|ts)$/i)) continue;

      await this.#loadMiddleware(fullPath, isFramework);
    }
  }

  /**
   * Import middleware and add to list
   */
  async #loadMiddleware(fullPath, isFramework) {
    try {
      const mod = await import(pathToFileUrl(fullPath));

      if (!mod?.default || typeof mod.default !== "function") {
        console.warn(
          `⚠️ Skipped middleware (no default function): ${fullPath}`
        );
        return;
      }

      // Extract optional 3-digit prefix for ordering
      const match = path.basename(fullPath).match(/^(\d{3})-/);
      mod.default.__order = match ? parseInt(match[1], 10) : 999;

      this.middlewares.push(mod.default);

      console.log(
        `Middleware loaded: ${path.basename(fullPath)}  (${
          isFramework ? "framework" : "app"
        }: ${fullPath})`
      );
    } catch (err) {
      console.error(`❌ Failed to load middleware: ${fullPath}`);
      console.error(err);
    }
  }
}

/**
 * Convert a filesystem path to a file:// URL for ES module import
 */
function pathToFileUrl(filepath) {
  let resolved = path.resolve(filepath);
  let url = resolved.replace(/\\/g, "/"); // Windows fix
  if (!url.startsWith("/")) url = "/" + url;
  return `file://${url}`;
}
