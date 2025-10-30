// config.js:
//
"use strict";

import fs from "fs";
import crypto from "crypto";
import * as TOML from "@iarna/toml";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

/**
 * @class Config
 * @classdesc Utility class for loading, saving, validating, and encrypting configuration data
 * in multiple formats (ENV, JSON, TOML), or directly from a JavaScript object.
 */
export default class Config {
  /**
   * Optional validation hook.
   * Override this in subclasses to perform schema or type validation.
   * @param {Record<string, any>} values - Object of key-value pairs to validate.
   * @throws {Error} If validation fails.
   */
  validate(values) {
    // Override in subclasses
  }

  // ----------------------
  // ENV file support
  // ----------------------

  /**
   * Load configuration values from a plain or encrypted `.env`-style file.
   * @param {string} filename - Path to the environment file.
   * @param {string|undefined} [encryptKey] - Optional encryption key (UTF-8 string).
   */
  loadEnvFile(filename, encryptKey = undefined) {
    let fileContent = fs.readFileSync(filename);

    if (encryptKey) {
      fileContent = this.decrypt(fileContent, encryptKey);
    }

    fileContent
      .toString()
      .split("\n")
      .forEach(line => {
        const [key, value] = line.split("=");
        if (key && value) {
          Object.defineProperty(this, key.trim(), {
            value: value.trim(),
            writable: false,
            configurable: false,
            enumerable: true,
          });
        }
      });

    this.validate(this);
  }

  /**
   * Save current configuration as a `.env`-style file.
   * @param {string} filename - Output file path.
   * @param {string|undefined} [encryptKey] - Optional encryption key.
   */
  saveEnvFile(filename, encryptKey = undefined) {
    const lines = Object.entries(this)
      .filter(([key, val]) => typeof val === "string")
      .map(([key, val]) => `${key}=${val}`);

    const content = lines.join("\n");
    let outputBuffer = encryptKey
      ? this.encrypt(Buffer.from(content, "utf8"), encryptKey)
      : Buffer.from(content, "utf8");

    fs.writeFileSync(filename, outputBuffer);
  }

  // ----------------------
  // JSON file support
  // ----------------------

  /**
   * Load configuration from a plain or encrypted JSON file.
   * @param {string} filename - Path to JSON file.
   * @param {string|undefined} [encryptKey] - Optional encryption key.
   */
  loadJSONFile(filename, encryptKey = undefined) {
    let fileContent = fs.readFileSync(filename);

    if (encryptKey) {
      fileContent = this.decrypt(fileContent, encryptKey);
    }

    const jsonObj = JSON.parse(fileContent.toString("utf8"));

    Object.entries(jsonObj).forEach(([key, value]) => {
      Object.defineProperty(this, key, {
        value,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    });

    this.validate(this);
  }

  /**
   * Save configuration to a JSON file.
   * @param {string} filename - Output file path.
   * @param {string|undefined} [encryptKey] - Optional encryption key.
   */
  saveJSONFile(filename, encryptKey = undefined) {
    const jsonObj = {};

    Object.entries(this).forEach(([key, value]) => {
      if (typeof value !== "function") {
        jsonObj[key] = value;
      }
    });

    const jsonString = JSON.stringify(jsonObj, null, 2);
    let outputBuffer = encryptKey
      ? this.encrypt(Buffer.from(jsonString, "utf8"), encryptKey)
      : Buffer.from(jsonString, "utf8");

    fs.writeFileSync(filename, outputBuffer);
  }

  // ----------------------
  // TOML file support
  // ----------------------

  /**
   * Load configuration from a plain or encrypted TOML file.
   * @param {string} filename - Path to TOML file.
   * @param {string|undefined} [encryptKey] - Optional encryption key.
   */
  loadTOMLFile(filename, encryptKey = undefined) {
    let fileContent = fs.readFileSync(filename);

    if (encryptKey) {
      fileContent = this.decrypt(fileContent, encryptKey);
    }

    const tomlString = fileContent.toString("utf8");
    const tomlObj = TOML.parse(tomlString);

    Object.entries(tomlObj).forEach(([key, value]) => {
      Object.defineProperty(this, key, {
        value,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    });

    this.validate(this);
  }

  /**
   * Save current config as TOML to a plain or encrypted file.
   * @param {string} filename - Output file path.
   * @param {string|undefined} [encryptKey] - Optional encryption key.
   */
  saveTOMLFile(filename, encryptKey = undefined) {
    const tomlObj = {};

    Object.entries(this).forEach(([key, value]) => {
      if (typeof value !== "function") {
        tomlObj[key] = value;
      }
    });

    const tomlString = TOML.stringify(tomlObj);

    let outputBuffer = encryptKey
      ? this.encrypt(Buffer.from(tomlString, "utf8"), encryptKey)
      : Buffer.from(tomlString, "utf8");

    fs.writeFileSync(filename, outputBuffer);
  }

  // ----------------------
  // Encryption helpers
  // ----------------------

  /**
   * Encrypt a data buffer using AES-256-CBC.
   * @param {Buffer} data - Data to encrypt.
   * @param {string} encryptKey - Encryption key (UTF-8 string).
   * @returns {Buffer} Encrypted data (IV prepended).
   */
  encrypt(data, encryptKey) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(encryptKey, "utf8");
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt AES-256-CBC encrypted data.
   * @param {Buffer} encryptedData - Data buffer (IV prepended).
   * @param {string} encryptKey - Encryption key (UTF-8 string).
   * @returns {Buffer} Decrypted data buffer.
   */
  decrypt(encryptedData, encryptKey) {
    const iv = encryptedData.slice(0, IV_LENGTH);
    const encryptedText = encryptedData.slice(IV_LENGTH);
    const key = Buffer.from(encryptKey, "utf8");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  }

  // ----------------------
  // Object loading support (with merge/override)
  // ----------------------

  /**
   * Load or merge configuration values from a plain object.
   * Each key/value pair is added to this instance. Existing keys can be overwritten
   * depending on the `writable` flag.
   *
   * @param {Record<string, any>} [values={}] - Plain object containing configuration values.
   * @param {boolean} [writable=false] - If true, allows overwriting existing keys.
   * @throws {TypeError} If `values` is not a plain object.
   * @throws {Error} If validation fails.
   *
   * @example
   * const config = new Config();
   * config.loadObject({ port: 3000, env: "dev" });
   * config.loadObject({ debug: true }, false); // merges without overwriting
   * config.loadObject({ port: 8080 }, true);   // overwrites existing port
   */
  loadObject(values = {}, writable = false) {
    if (
      typeof values !== "object" ||
      values === null ||
      Array.isArray(values)
    ) {
      throw new TypeError("Config.loadObject() expects a plain object.");
    }

    for (const [key, value] of Object.entries(values)) {
      const alreadyExists = Object.prototype.hasOwnProperty.call(this, key);

      if (alreadyExists && !writable) {
        // Skip if key already exists and overwriting is disabled
        continue;
      }

      // Define or redefine property with merge/override support
      Object.defineProperty(this, key, {
        value,
        writable, // user-specified write behavior
        configurable: true, // allows redefinition in future calls
        enumerable: true,
      });
    }

    this.validate(this);
  }
}
