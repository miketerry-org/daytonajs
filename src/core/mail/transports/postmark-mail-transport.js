// postmarkTransport.js:

"use strict";

import MailTransport from "./mailTransport.js";
import msg from "./msg.js";
import { verify } from "milwaukee-foundation";

// Declare postmark package placeholder (lazy-loaded)
let postmark;

/**
 * @class PostmarkTransport
 * @extends MailTransport
 * @description
 * Sends messages via the Postmark API using the official SDK.
 */
export default class PostmarkTransport extends MailTransport {
  /**
   * @param {Config} config - Must include postmark.api_key
   */
  constructor(config) {
    super(config);

    /** @private {import("postmark").ServerClient|null} */
    this._client = null;
  }

  /**
   * Verify required config properties for Postmark.
   * @param {Config} config
   */
  verifyConfig(config) {
    let results = verify(config).isObject("postmark", true);

    if (results.errors.length === 0) {
      results = verify(config.postmark).isString("api_key", true, 10, 128);
    }

    if (results.errors.length > 0) {
      throw new Error(
        `${this.constructor.name}.verifyConfig failed! (${results.errors.join(
          ", "
        )})`
      );
    }
  }

  /**
   * Connect to Postmark API.
   */
  async connect() {
    if (this.connected) return;

    // Lazy-load Postmark SDK
    if (!postmark) {
      postmark = (await import("postmark")).ServerClient;
    }

    this._client = new postmark(this.config.postmark.api_key);
    this.connected = true;
  }

  /**
   * Disconnect (no-op for Postmark).
   */
  async disconnect() {
    this._client = null;
    this.connected = false;
  }

  /**
   * Send a Message instance via Postmark
   * @param {Message} message
   * @returns {Promise<Object>} Normalized response
   */
  async sendMail(message) {
    if (!this.connected) {
      await this.connect();
    }

    const from = message.fromAddr[0].name
      ? `"${message.fromAddr[0].name}" <${message.fromAddr[0].email}>`
      : message.fromAddr[0].email;

    const to = message.toList
      .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
      .join(", ");

    const cc = message.ccList
      .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
      .join(", ");

    const bcc = message.bccList
      .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
      .join(", ");

    const attachments =
      message.attachments?.map(att => ({
        Name: att.filename,
        Content: att.content.toString("base64"),
        ContentType: att.contentType || "application/octet-stream",
      })) || [];

    const mailOptions = {
      From: from,
      To: to,
      Cc: cc || undefined,
      Bcc: bcc || undefined,
      Subject: message.subjectLine,
      TextBody: message.text || undefined,
      HtmlBody: message.html || undefined,
      Attachments: attachments.length > 0 ? attachments : undefined,
    };

    try {
      const response = await this._client.sendEmail(mailOptions);
      return {
        success: true,
        messageId: response.MessageID,
        submittedAt: response.SubmittedAt,
        to: response.To,
        status: response.Message,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /** Metadata about this transport */
  getInfo() {
    return {
      provider: "postmark",
      apiKeyPresent: !!this.config.postmark.api_key,
    };
  }
}
