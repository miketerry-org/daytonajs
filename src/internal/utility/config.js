// config.js

import path from "path";
import fs from "fs";
import crypto from "crypto";
import * as TOML from "@iarna/toml";
import encryptKey from "./load-encrypt-key.js";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

/**
 * @class Config
 * @classdesc Utility class for loading, saving, validating, and encrypting configuration data
 * in multiple formats (ENV, JSON, TOML), or directly from a JavaScript object.
 */
export default class Config {
  static createFromEnvFile(filename) {
    return new this().loadEnvFile(filename, encryptKey);
  }

  static createFromJSONFile(filename) {
    return new this().loadJSONFile(filename, encryptKey);
  }

  static createFromTOMLFile(filename) {
    return new this().loadTOMLFile(filename, encryptKey);
  }

  static createFromObject(values = {}, writable = false) {
    return new this().loadObject(values, writable);
  }

  /**
   * Optional validation hook.
   * Override this in subclasses to perform schema or type validation.
   */
  validate(values) {
    // Override in subclasses
  }

  // ----------------------
  // ENV file support
  // ----------------------

  loadEnvFile(filename) {
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
    return this;
  }

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
    return this;
  }

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

  loadTOMLFile(filename) {
    filename = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filename)) {
      throw new Error(`File not found! (${filename}) `);
    }

    // read the encrypted file buffer
    let fileContent = fs.readFileSync(filename);

    // if there is an encryption key then use it
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
    return this;
  }

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
   */
  encrypt(data, encryptKey) {
    const iv = crypto.randomBytes(IV_LENGTH);

    // FIX: Use hex key, not UTF-8 text
    const key = Buffer.from(encryptKey, "hex");

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt AES-256-CBC encrypted data.
   */
  decrypt(encryptedData, encryptKey) {
    const iv = encryptedData.slice(0, IV_LENGTH);
    const encryptedText = encryptedData.slice(IV_LENGTH);

    // FIX: Use hex key, not UTF-8 text
    const key = Buffer.from(encryptKey, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  }

  // ----------------------
  // Object loader
  // ----------------------

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
        continue;
      }

      Object.defineProperty(this, key, {
        value,
        writable,
        configurable: true,
        enumerable: true,
      });
    }

    this.validate(this);
    return this;
  }
}
