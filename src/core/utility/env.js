// env.js:

/**
 * @fileoverview Environment configuration utility.
 * Loads and validates environment variables, normalizes NODE_ENV,
 * and provides safe accessors for environment-specific configuration.
 */

import msg from "./msg.js";

// Ensure NODE_ENV is defined early
if (!process.env.NODE_ENV) {
  console.warn(msg.nodeEnvNotSet);
  process.env.NODE_ENV = "production";
}

/**
 * @class Environment
 * @classdesc Provides access to normalized environment settings and validated environment variables.
 */
class Environment {
  static #labels = {
    production: ["prod", "production"],
    staging: ["stage", "staging"],
    development: ["dev", "development"],
    testing: ["test", "testing"],
  };

  /**
   * Normalizes the raw NODE_ENV and returns a canonical mode.
   * Also updates `process.env.NODE_ENV` to the normalized value.
   * @returns {"production" | "staging" | "development" | "testing"}
   */
  get mode() {
    const raw = process.env.NODE_ENV?.toLowerCase().trim();
    let canonical;

    if (Environment.#labels.production.includes(raw)) {
      canonical = "production";
    } else if (Environment.#labels.staging.includes(raw)) {
      canonical = "staging";
    } else if (Environment.#labels.development.includes(raw)) {
      canonical = "development";
    } else if (Environment.#labels.testing.includes(raw)) {
      canonical = "testing";
    } else {
      console.warn(msg.unknownNodeEnv.replace("{value}", process.env.NODE_ENV));
      canonical = "production";
    }

    process.env.NODE_ENV = canonical;
    return canonical;
  }

  /** @returns {boolean} True if environment is production. */
  get isProduction() {
    return this.mode === "production";
  }

  /** @returns {boolean} True if environment is staging. */
  get isStaging() {
    return this.mode === "staging";
  }

  /** @returns {boolean} True if environment is development. */
  get isDevelopment() {
    return this.mode === "development";
  }

  /** @returns {boolean} True if environment is testing. */
  get isTesting() {
    return this.mode === "testing";
  }

  /**
   * Retrieves and validates the encryption key.
   * Must be a 64-character hexadecimal string.
   * @throws {Error} If key is missing, invalid length, or invalid format.
   * @returns {string} The validated encryption key.
   */
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

  /**
   * Retrieves the appropriate database URI based on the environment.
   * @throws {Error} If no valid URI is found for the current mode.
   * @returns {string} The database connection string.
   */
  get databaseURI() {
    const envMap = {
      production: process.env.DATABASE_URI_PRODUCTION,
      staging: process.env.DATABASE_URI_STAGING,
      development: process.env.DATABASE_URI_DEVELOPMENT,
      testing: process.env.DATABASE_URI_TESTING,
    };

    const uri = envMap[this.mode];
    if (!uri) {
      throw new Error(`Database URI not set for mode "${this.mode}".`);
    }

    return uri;
  }

  /**
   * Retrieves and validates the server node identifier.
   * Must be an integer between 1 and 1000.
   * @throws {Error} If invalid or missing.
   * @returns {number} The validated server node number.
   */
  get serverNode() {
    const value = Number.parseInt(process.env.SERVER_NODE, 10);
    if (Number.isInteger(value) && value >= 1 && value <= 1000) {
      return value;
    }
    throw new Error(
      `"SERVER_NODE" environment variable must be an integer between 1 and 1000.`
    );
  }
}

// Instantiate and export singleton instance
const env = new Environment();
export default env;
