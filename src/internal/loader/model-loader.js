// -----------------------------------------------------------------------------
// model-loader.js
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL as nodePathToFileURL } from "url";

/**
 * Resolve framework root (root of the MVC package)
 */
const __filename = fileURLToPath(import.meta.url);
const frameworkRoot = path.resolve(__filename, "../../..");

/**
 * Application root
 */
const appRoot = process.cwd();

export default class ModelLoader {
  constructor() {
    this.modelClasses = new Map(); // key = modelName, value = { name, file, class, origin }
    this.loadedModels = []; // for logging summary
  }

  /**
   * Load framework models first, then application models
   */
  async load() {
    // 1. Load framework models
    await this.#scanFolder(path.join(frameworkRoot, "models"), true);

    // 2. Load application models
    await this.#scanFolder(appRoot, false);

    // Log summary
    if (this.loadedModels.length > 0) {
      console.log("\n✅ Loaded models:");
      this.loadedModels.forEach(m => {
        console.log(
          ` • ModelName: ${m.name}  (file: ${m.file}, origin: ${m.origin})`
        );
      });
      console.log("─────────────────────────────────────────────\n");
    }

    // Return array of { name, file, class }
    return [...this.modelClasses.values()].map(
      ({ name, file, class: cls }) => ({
        name,
        file,
        class: cls,
      })
    );
  }

  /**
   * Recursively scan for model files
   */
  async #scanFolder(folder, isFramework) {
    if (!fs.existsSync(folder)) return;

    const files = fs.readdirSync(folder, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        if (!isFramework && file.name === "node_modules") continue;
        await this.#scanFolder(fullPath, isFramework);
      } else if (file.name.match(/-(model|record|gateway)\.(js|ts)$/i)) {
        await this.#loadModelClass(fullPath, isFramework);
      }
    }
  }

  /**
   * Import a model class and store it
   */
  async #loadModelClass(fullPath, isFramework) {
    try {
      const mod = await import(nodePathToFileURL(fullPath).href);
      const ModelClass = mod.default;

      if (!ModelClass || typeof ModelClass.modelName !== "function") {
        console.warn(`⚠️ Skipping invalid model class: ${fullPath}`);
        return;
      }

      const name = ModelClass.modelName();
      if (typeof name !== "string" || !name.trim()) {
        console.warn(`⚠️ Invalid modelName() returned from ${fullPath}`);
        return;
      }

      // Check for duplicates
      if (this.modelClasses.has(name)) {
        const existing = this.modelClasses.get(name);
        throw new Error(
          `❌ Duplicate modelName detected: "${name}"\n` +
            ` - Existing: ${existing.file}\n` +
            ` - Duplicate: ${fullPath}`
        );
      }

      // Application overrides framework silently
      if (this.modelClasses.has(name) && isFramework) {
        console.log(`⚠️ Framework model overridden by application: ${name}`);
      }

      this.modelClasses.set(name, {
        name,
        file: fullPath,
        class: ModelClass,
        origin: isFramework ? "framework" : "app",
      });

      this.loadedModels.push({
        name,
        file: fullPath,
        origin: isFramework ? "framework" : "app",
      });
    } catch (err) {
      console.error(`❌ Failed to load model: ${fullPath}`);
      console.error(err);
    }
  }
}
