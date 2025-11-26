// config-loader.js

import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as TOML from "@iarna/toml";
import deepFreeze from "../utility/deep-freeze.js";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

let cachedConfig = null; // <-- Singleton cache

export default class ConfigLoader {
  constructor() {
    this.appRoot = process.cwd();
    this.configPath = path.join(this.appRoot, "config.toml.secret");

    this.loadErrors = [];
    this.loadedMeta = {
      file: this.configPath,
      decrypted: false,
      parsed: false,
    };
  }

  // ================================================================
  // Load and return config (cached & deep-frozen)
  // ================================================================
  load() {
    if (cachedConfig) {
      return cachedConfig;
    }

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

      cachedConfig = deepFreeze(parsed); // <-- cache & freeze
      return cachedConfig;
    } catch (err) {
      this.loadErrors.push(err);
      throw err;
    }
  }

  #readEncryptedFile() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }
    return fs.readFileSync(this.configPath);
  }

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
}
