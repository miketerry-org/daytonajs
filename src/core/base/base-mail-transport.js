"use strict";

import Config from "../utility/config.js";
import BaseClass from "./base-class.js";

/**
 * @file MailTransport.js
 * @description
 * Abstract base transport class requiring a valid Config instance.
 * Concrete transports (SMTP, Postmark, SendGrid, etc.) must extend this class
 * and implement `sendMail()`.
 */
export default class MailTransport extends BaseClass {
  /**
   * @param {Config} config - Required configuration instance.
   * @throws {TypeError} If config is missing or not a Config instance.
   */
  constructor(config) {
    // Ensure a valid config is provided
    if (!(config instanceof Config)) {
      throw new TypeError(
        "MailTransport constructor requires a valid Config instance"
      );
    }

    super(config);

    /** @protected */
    this.connected = false;
  }

  /**
   * Optional: establish connection or prepare the transport.
   * Some transports (e.g., SMTP) may require initialization.
   * @returns {Promise<void>}
   */
  async connect() {
    this.connected = true;
  }

  /**
   * Optional: close connection or clean up resources.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.connected = false;
  }

  /**
   * Send a normalized MailMessage via this transport.
   * Must be implemented by subclasses.
   *
   * @abstract
   * @param {MailMessage} message - The message to send.
   * @returns {Promise<MailResponse>} - The provider's response.
   */
  async sendMail(message) {
    throw new Error("sendMail() must be implemented by subclasses.");
  }

  /**
   * Returns metadata about this transport, useful for debugging or logging.
   * @returns {{ provider: string, config: Config }}
   */
  getInfo() {
    return {
      provider: this.constructor.name.replace("Transport", "").toLowerCase(),
      config: this.config,
    };
  }
}
