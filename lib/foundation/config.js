// config.js:

"use strict";

import fs from "fs";
import crypto from "crypto";
import * as TOML from "@iarna/toml";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

export default class Config {
  validate(values) {}

  // ----------------------
  // ENV file support
  // ----------------------

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

  /**
   * Load configuration from a plain or encrypted TOML file.
   * @param {string} filename
   * @param {string|undefined} encryptKey
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
   * @param {string} filename
   * @param {string|undefined} encryptKey
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

  encrypt(data, encryptKey) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(encryptKey, "utf8");
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  decrypt(encryptedData, encryptKey) {
    const iv = encryptedData.slice(0, IV_LENGTH);
    const encryptedText = encryptedData.slice(IV_LENGTH);
    const key = Buffer.from(encryptKey, "utf8");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  }
}
