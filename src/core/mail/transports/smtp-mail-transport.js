// smtp-mail-transport.js:

import BaseMailTransport from "../../base/base-mail-transport.js";
import verify from "../../utility/verify.js";

// Lazy-load nodemailer
let nodemailer;

/**
 * @class SmtpMailTransport
 * @extends BaseMailTransport
 * @description
 * Sends messages via SMTP using Nodemailer.
 */
export default class SmtpMailTransport extends BaseMailTransport {
  /**
   * @param {Config} config - Must include smtp.host, smtp.port, smtp.username, smtp.password
   */
  constructor(config) {
    super(config);
    /** @private {import('nodemailer').Transporter|null} */
    this._transporter = null;
  }

  /**
   * Verify required config properties for SMTP.
   * @param {Config} config
   */
  verifyConfig(config) {
    let results = verify(config).isObject("smtp", true);

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
   * Connect to SMTP server
   */
  async connect() {
    if (this.connected) return;

    if (!nodemailer) {
      nodemailer = (await import("nodemailer")).default;
    }

    const smtp = this.config.smtp;

    this._transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: !!smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      ...smtp.options,
    });

    await this._transporter.verify();
    this.connected = true;
  }

  /**
   * Disconnect from SMTP server
   */
  async disconnect() {
    if (this._transporter?.close) this._transporter.close();
    this.connected = false;
  }

  /**
   * Send a Message instance via SMTP
   * @param {Message} message
   */
  async sendMail(message) {
    this.validateMessage(message);
    await this.ensureConnected();

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
      return this.normalizeResponse({
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        status: info.response,
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Transport metadata
   */
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
