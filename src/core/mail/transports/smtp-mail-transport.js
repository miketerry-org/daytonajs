// smtpTransport.js:

"use strict";

import BaseMailTransport from "../../base/base-mail-transport.js";
import msg from "../../utility/msg.js";
import verify from "../../utility/verify.js";

// Declare nodemailer placeholder
let nodemailer;

/**
 * @class SMTPTransport
 * @extends MailTransport
 * @description
 * Sends messages via an SMTP server using Nodemailer.
 */
export default class SMTPTransport extends BaseMailTransport {
  /**
   * @param {Config} config - Must include smtp.host, smtp.port, smtp.auth.user, smtp.auth.pass
   */
  constructor(config) {
    super(config);

    /** @private {import('nodemailer').Transporter} */
    this._transporter = null;
  }

  /**
   * Verify required config properties for SMTP.
   * @param {Config} config
   */
  verifyConfig(config) {
    // Ensure config.smtp exists and is an object
    let results = verify(config).isObject("smtp", true);

    // Only continue deeper validation if smtp object exists
    if (results.errors.length === 0) {
      results = verify(config.smtp)
        .isString("host", true, 1, 255)
        .isInteger("port", true, 1, 65535)
        .isBoolean("secure", true)
        .isString("username", true, 1, 255)
        .isString("password", true, 1, 255);
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
   * Connect to the SMTP server.
   */
  async connect() {
    if (this.connected) {
      return;
    }

    // Lazy-load nodemailer if not yet imported
    if (!nodemailer) {
      nodemailer = (await import("nodemailer")).default;
    }

    const smtp = this.config.smtp;

    this._transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: !!smtp.secure, // true for 465, false for others
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      ...smtp.options, // any additional nodemailer options
    });

    // Verify connection
    await this._transporter.verify();
    this.connected = true;
  }

  /**
   * Disconnect (close transporter).
   */
  async disconnect() {
    if (this._transporter?.close) {
      this._transporter.close();
    }
    this.connected = false;
  }

  /**
   * Send a Message instance via SMTP
   * @param {Message} message
   * @returns {Promise<Object>} Normalized response
   */
  async sendMail(message) {
    if (!this.connected) await this.connect();

    // Convert Message to Nodemailer format
    const mailOptions = {
      from: message.fromAddr[0].name
        ? `"${message.fromAddr[0].name}" <${message.fromAddr[0].email}>`
        : message.fromAddr[0].email,
      to: message.toList
        .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
        .join(", "),
      cc: message.ccList
        .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
        .join(", "),
      bcc: message.bccList
        .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
        .join(", "),
      subject: message.subjectLine,
      text: message.text,
      html: message.html,
      attachments: message.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      })),
    };

    try {
      const info = await this._transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
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
    const smtp = this.config.smtp;
    return {
      provider: "smtp",
      host: smtp.host,
      port: smtp.port,
      secure: !!smtp.secure,
    };
  }
}
