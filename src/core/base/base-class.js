// src/core/base/index.js:
//
"use strict";

import Config from "../utility/config.js";
import msg from "../utility/msg.js";

/**
 * @module base
 * @description
 * Abstract base class providing shared initialization and validation logic
 * for MesaMailer components (e.g., transports, mailers, utilities, etc.).
 *
 * Subclasses may optionally use a `Config` instance. If no config is provided,
 * the Base class gracefully disables configuration-related features.
 */
export default class BaseClass {
  #config;

  /**
   * @param {Config} [config] - Optional configuration instance.
   * @throws {Error} If instantiated directly or invalid config is supplied.
   */
  constructor(config = undefined) {
    if (new.target === BaseClass) {
      throw new Error(msg.abstractClass);
    }

    // If config is provided, ensure it’s a valid instance
    if (config !== undefined && !(config instanceof Config)) {
      throw new TypeError(msg.invalidConfigParam);
    }

    // Only verify configuration if a valid one is provided
    if (config instanceof Config) {
      // use virtual method to verify configuration values
      const results = this.verifyConfig(config);

      // if one or more errors then join them before throwing a  new error
      if (results && results.errors.length > 0) {
        throw new Error(
          `Config Verification error: (${results.errors.join(", ")})`
        );
      }

      this.#config = config;
    } else {
      // No config — still allow object to exist without restrictions
      this.#config = undefined;
    }
  }

  /**
   * Subclasses may override this to validate configuration.
   * If no config is used, this is never called.
   *
   * @abstract
   * @param {Config} config
   * @throws {Error} If required config properties are missing or invalid.
   */
  verifyConfig(config) {
    return null;
  }

  /**
   * Helper for signaling that a subclass must override a method.
   * It throws a standardized, descriptive error message.
   *
   * @param {string} methodName - The name of the unimplemented method.
   * @throws {Error}
   */
  requireOverride(methodName) {
    const message = msg.methodMustBeOverridden
      ? `${msg.methodMustBeOverridden}: ${methodName}`
      : `Method must be overridden: ${methodName}`;
    throw new Error(message);
  }

  /**
   * Provides access to the internal configuration object.
   * Returns undefined if no config was provided.
   *
   * @returns {Config|undefined} The Config instance or undefined.
   */
  get config() {
    return this.#config;
  }

  /**
   * Indicates whether this instance was created with configuration.
   *
   * @returns {boolean}
   */
  get hasConfig() {
    return this.#config !== undefined;
  }
}
