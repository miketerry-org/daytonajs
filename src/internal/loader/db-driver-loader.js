// driver-loader.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import DriverRegistry from "../../db/driver-registry.js";

/**
 * Resolve framework root (root of the package)
 */
const __filename = fileURLToPath(import.meta.url);
const frameworkRoot = path.resolve(__filename, "../../..");

/**
 * Application root
 */
const appRoot = process.cwd();

export default class DriverLoader {
  constructor() {
    this.loadedDrivers = new Map(); // key = driverName, value = filePath
  }

  /**
   * Loads framework drivers first, then application drivers.
   * Application drivers override framework drivers on same driverName.
   */
  async load() {
    // 1. Framework drivers
    await this.#scanFolder(path.join(frameworkRoot, "drivers"), true);

    // 2. Application drivers
    await this.#scanFolder(appRoot, false);

    // Return array of loaded drivers { name, filePath }
    return [...this.loadedDrivers.entries()].map(([name, filePath]) => ({
      name,
      filePath,
    }));
  }

  /**
   * Recursively search for *-driver.js/ts files.
   */
  async #scanFolder(folder, isFramework) {
    if (!fs.existsSync(folder)) return;

    const files = fs.readdirSync(folder, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        // Skip node_modules during app scanning
        if (!isFramework && file.name === "node_modules") continue;

        await this.#scanFolder(fullPath, isFramework);
      } else if (file.name.match(/-driver\.(js|ts)$/i)) {
        await this.#loadDriver(fullPath, isFramework);
      }
    }
  }

  /**
   * Import driver class and register it.
   */
  async #loadDriver(fullPath, isFramework) {
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      const DriverClass = mod.default;

      if (!DriverClass || typeof DriverClass.driverName !== "function") {
        console.warn(
          `⚠️ Skipping invalid driver (no static driverName()): ${fullPath}`
        );
        return;
      }

      const driverName = DriverClass.driverName();

      if (typeof driverName !== "string" || !driverName.length) {
        console.warn(
          `⚠️ Invalid driverName() returned from ${fullPath}: must be a non-empty string`
        );
        return;
      }

      // Override notice
      if (this.loadedDrivers.has(driverName) && isFramework) {
        console.log(
          `⚠️ Framework driver overridden by application: ${driverName}`
        );
      }

      // Register into the global DriverRegistry
      DriverRegistry.add(driverName, DriverClass);

      // Track file path
      this.loadedDrivers.set(driverName, fullPath);

      console.log(
        `Driver loaded: ${driverName}  (${
          isFramework ? "framework" : "app"
        }: ${fullPath})`
      );
    } catch (err) {
      console.error(`❌ Failed to load driver: ${fullPath}`);
      console.error(err);
    }
  }
}

/**
 * Convert a filesystem path to a file:// URL for ESM import.
 */
function pathToFileURL(filepath) {
  return pathToFileURLInternal(filepath).href;
}

function pathToFileURLInternal(filepath) {
  return new URL(`file://${path.resolve(filepath)}`);
}
