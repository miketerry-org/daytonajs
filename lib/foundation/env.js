// env.js

"use strict";

import dotenv from "dotenv";
dotenv.config();

// import all necessary modules
import msg from "./msg.js";

// Set default NODE_ENV if undefined
if (!process.env.NODE_ENV) {
  console.warn(msg.nodeEnvNotSet);
  process.env.NODE_ENV = "production";
}

class Environment {
  static #prodLabels = ["prod", "production"];
  static #stageLabels = ["stage", "staging"];
  static #devLabels = ["dev", "development"];
  static #testLabels = ["test", "testing"];

  /** Normalize the raw NODE_ENV and return canonical mode; also normalize process.env.NODE_ENV. */
  get mode() {
    const raw = process.env.NODE_ENV?.toLowerCase().trim();
    let canonical;

    if (Environment.#prodLabels.includes(raw)) {
      canonical = "production";
    } else if (Environment.#stageLabels.includes(raw)) {
      canonical = "staging";
    } else if (Environment.#devLabels.includes(raw)) {
      canonical = "development";
    } else if (Environment.#testLabels.includes(raw)) {
      canonical = "testing";
    } else {
      console.warn(msg.unknownNodeEnv.replace("{value}", process.env.NODE_ENV));
      canonical = "production";
    }

    process.env.NODE_ENV = canonical;
    return canonical;
  }

  get isProduction() {
    return this.mode === "production";
  }
  get isStaging() {
    return this.mode === "staging";
  }
  get isDevelopment() {
    return this.mode === "development";
  }
  get isTesting() {
    return this.mode === "testing";
  }

  get encryptKey() {
    const key = process.env.ENCRYPT_KEY;
    if (!key || typeof key !== "string" || key.length !== 64) {
      throw new Error(msg.invalidEncryptKeyLength);
    }
    if (!/^[a-fA-F0-9]{64}$/.test(key)) {
      throw new Error(msg.invalidEncryptKeyFormat);
    }
    return key;
  }
}

const env = new Environment();
export default env;
