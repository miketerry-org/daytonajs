// config-loader.js

import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as TOML from "@iarna/toml";
import verify from "../../utility/verify.js";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * ConfigLoader
 * Loads, decrypts, parses, and exposes a single `config.toml.secret`
 * located at the application root.
 */
export default class ConfigLoader {
  constructor() {
    this.appRoot = process.cwd();
    this.configPath = path.join(this.appRoot, "config.toml.secret");

    this.config = null;
    this.loadErrors = [];

    this.loadedMeta = {
      file: this.configPath,
      decrypted: false,
      parsed: false,
      validated: false,
    };
  }

  // ================================================================
  // Public: Load and return config
  // ================================================================
  async load() {
    const ENCRYPT_KEY = process.env.CONFIG_ENCRYPT_KEY;
    if (!ENCRYPT_KEY) {
      throw new Error("CONFIG_ENCRYPT_KEY environment variable must be set");
    }
    if (ENCRYPT_KEY.length !== 64) {
      throw new Error(
        `CONFIG_ENCRYPT_KEY must be 32 bytes (64 hex chars), got ${ENCRYPT_KEY.length}`
      );
    }

    try {
      const buffer = this.#readEncryptedFile();
      const decrypted = this.#decrypt(buffer, ENCRYPT_KEY);
      this.loadedMeta.decrypted = true;

      const tomlStr = decrypted.toString("utf8");
      const parsed = TOML.parse(tomlStr);
      this.loadedMeta.parsed = true;

      this.verifyConfig(parsed);
      this.validateConfig(parsed);
      this.loadedMeta.validated = true;

      this.config = parsed;

      return parsed;
    } catch (err) {
      this.loadErrors.push(err);
      throw err;
    }
  }

  // ================================================================
  // Read encrypted file
  // ================================================================
  #readEncryptedFile() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }
    return fs.readFileSync(this.configPath);
  }

  // ================================================================
  // Decrypt file contents
  // ================================================================
  #decrypt(buffer, key) {
    try {
      const iv = buffer.slice(0, IV_LENGTH);
      const encryptedText = buffer.slice(IV_LENGTH);
      const keyBuffer = Buffer.from(key, "hex");

      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final(),
      ]);

      return decrypted;
    } catch (err) {
      console.error("❌ Config decryption failed");
      throw err;
    }
  }

  // ================================================================
  // Empty validation hooks (to be implemented by the user)
  // ================================================================
  verifyConfig(_config) {
    // Placeholder for structural validation
  }

  validateConfig(_config) {
    const results = verify(_config.server);
    console.log("results", results);
  }

  // ================================================================
  // Public API
  // ================================================================
  getConfig() {
    return this.config;
  }

  getSection(pathStr) {
    if (!this.config) return null;
    const parts = pathStr.split(".");
    let current = this.config;
    for (const key of parts) {
      if (current[key] === undefined) return null;
      current = current[key];
    }
    return current;
  }

  listSections() {
    if (!this.config) return [];
    return Object.keys(this.config);
  }

  // ================================================================
  // Custom serialization for console.log / JSON
  // ================================================================
  toJSON() {
    return {
      config: this.config,
      loadedMeta: this.loadedMeta,
      configPath: this.configPath,
    };
  }
}
