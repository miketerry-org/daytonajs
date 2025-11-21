// message.js:

import BaseClass from "../base/base-class.js";

/**
 * @file Message.js
 * @description
 * Represents an email message to be sent via a MailTransport.
 * Supports multiple recipients of each type and method chaining.
 */
export default class Message extends BaseClass {
  constructor() {
    super();

    /** @protected {Array<{email:string,name:string}>} */
    this.fromAddr = [];

    /** @protected {Array<{email:string,name:string}>} */
    this.toList = [];

    /** @protected {Array<{email:string,name:string}>} */
    this.ccList = [];

    /** @protected {Array<{email:string,name:string}>} */
    this.bccList = [];

    /** @protected {string} */
    this.subjectLine = "";

    /** @protected {string} */
    this.text = "";

    /** @protected {string} */
    this.html = "";

    /** @protected {Array<{filename:string, content:any}>} */
    this.attachments = [];
  }

  /** Add sender (from) */
  from(email, name = "") {
    this.fromAddr = [{ email, name }];
    return this;
  }

  /** Add TO recipient */
  to(email, name = "") {
    this.toList.push({ email, name });
    return this;
  }

  /** Add CC recipient */
  cc(email, name = "") {
    this.ccList.push({ email, name });
    return this;
  }

  /** Add BCC recipient */
  bcc(email, name = "") {
    this.bccList.push({ email, name });
    return this;
  }

  /** Set subject */
  subject(subj) {
    this.subjectLine = subj;
    return this;
  }

  /** Set plain text body */
  textBody(text) {
    this.text = text;
    return this;
  }

  /** Set HTML body */
  htmlBody(html) {
    this.html = html;
    return this;
  }

  /** Add attachment (just filename for now, content can be added later) */
  attachment(filename, content = null) {
    this.attachments.push({ filename, content });
    return this;
  }

  /** Validate the message before sending */
  validate() {
    if (!this.fromAddr.length)
      throw new Error("Message must have a 'from' address.");
    if (!this.toList.length && !this.ccList.length && !this.bccList.length)
      throw new Error("Message must have at least one recipient.");
    if (!this.text && !this.html)
      throw new Error("Message must have either text or HTML body.");
    return true;
  }

  /** Return normalized object for transport */
  toJSON() {
    return {
      from: this.fromAddr[0] || null,
      to: this.toList,
      cc: this.ccList,
      bcc: this.bccList,
      subject: this.subjectLine,
      text: this.text,
      html: this.html,
      attachments: this.attachments,
    };
  }

  /**
   * Send the message via a transport instance.
   * @param {MailTransport} transport
   */
  async send(transport) {
    this.validate();
    if (!transport || typeof transport.sendMail !== "function") {
      throw new Error("Invalid transport provided to send()");
    }
    return await transport.sendMail(this);
  }
}
