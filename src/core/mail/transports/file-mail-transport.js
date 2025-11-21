// file_mail_transport.js:

import fs from "fs/promises";
import path from "path";
import toml from "@iarna/toml";
import BaseMailTransport from "../../base/base-mail-transport.js";
import verify from "../../utility/verify.js";

/**
 * @class FileMailTransport
 * @extends BaseMailTransport
 * @description
 * Writes email messages to disk in TOML format for development/testing.
 */
export default class FileMailTransport extends BaseMailTransport {
  /**
   * @param {Config} config - Must include fileMail.dir
   */
  constructor(config) {
    super(config);
    /** @private {string} */
    this._dir = this.config.fileMail?.dir || "messages";
    /** @private {boolean} */
    this.connected = false;
  }

  /**
   * Verify required config properties
   */
  verifyConfig(config) {
    const results = verify(config).isObject("fileMail", true);
    if (results.errors.length === 0) {
      verify(config.fileMail).isString("dir", true, 1, 255);
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
   * "Connect" creates the directory if it doesn't exist
   */
  async connect() {
    if (this.connected) return;

    try {
      await fs.mkdir(this._dir, { recursive: true });
      this.connected = true;
    } catch (err) {
      throw new Error(`Failed to create mail directory: ${err.message}`);
    }
  }

  /**
   * Disconnect (no-op)
   */
  async disconnect() {
    this.connected = false;
  }

  /**
   * Send a Message instance by writing it to disk
   * @param {Message} message
   */
  async sendMail(message) {
    await this.ensureConnected();
    this.validateMessage(message);

    // Build filename: sequence + abbreviated subject
    const files = await fs.readdir(this._dir);
    const msgFiles = files.filter(f => f.match(/^\d{3}_/));
    const nextNumber = String(msgFiles.length + 1).padStart(3, "0");

    // Abbreviate subject to 30 characters, remove special characters for filenames
    const subjectClean = (message.subjectLine || "no-subject")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 30);

    const filename = `${nextNumber}_${subjectClean}.toml`;
    const filepath = path.join(this._dir, filename);

    // Convert message to TOML object
    const tomlData = {
      from: message.fromAddr[0] || null,
      to: message.toList,
      cc: message.ccList,
      bcc: message.bccList,
      subject: message.subjectLine,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content?.toString?.("base64") || null,
        contentType: att.contentType || null,
      })),
      createdAt: new Date().toISOString(),
    };

    try {
      await fs.writeFile(filepath, toml.stringify(tomlData), "utf8");
      return { success: true, file: filepath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Metadata about this transport
   */
  getInfo() {
    return {
      provider: "file",
      dir: this._dir,
    };
  }

  /**
   * Helper to ensure connection
   */
  async ensureConnected() {
    if (!this.connected) {
      await this.connect();
    }
  }
}
