// base-mail-transport.js
"use strict";

import BaseClass from "./base-class.js";

/**
 * @class BaseMailTransport
 * @extends BaseClass
 * @description
 * Abstract base class for all mail transports.
 * Provides lifecycle hooks, connection handling, message validation, and response normalization.
 */
export default class BaseMailTransport extends BaseClass {
  constructor(config) {
    super(config);
    this.connected = false;
  }

  /**
   * Connect to the transport.
   * Must be implemented by subclass.
   */
  async connect() {
    this.requireOverride("connect");
  }

  /**
   * Disconnect from the transport.
   * Must be implemented by subclass.
   */
  async disconnect() {
    this.requireOverride("disconnect");
  }

  /**
   * Ensure transport is connected before sending.
   */
  async ensureConnected() {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Validate the message instance.
   */
  validateMessage(message) {
    if (!message || typeof message.validate !== "function") {
      throw new Error("Invalid Message instance");
    }
    message.validate();
  }

  /**
   * Normalize sendMail responses for consistent interface across transports.
   */
  normalizeResponse({
    messageId,
    accepted = [],
    rejected = [],
    status,
    extra = {},
  }) {
    return { success: true, messageId, accepted, rejected, status, ...extra };
  }

  /**
   * Send a message via this transport.
   * Must be implemented by subclass.
   * @param {Message} message
   */
  async sendMail(message) {
    this.requireOverride("sendMail");
  }

  /**
   * Metadata about this transport.
   */
  getInfo() {
    return { provider: "base" };
  }
}
