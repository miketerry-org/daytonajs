// logger.js

import { Papertrail } from "papertrail";

export default class Logger {
  constructor(options = {}) {
    const {
      host = process.env.PAPERTRAIL_HOST,
      port = Number(process.env.PAPERTRAIL_PORT),
      program = "my-app",
    } = options;

    if (!host || !port) {
      throw new Error("PAPERTRAIL_HOST and PAPERTRAIL_PORT must be set");
    }

    this.client = new Papertrail({
      host,
      port,
      program,
    });

    this.client.on("error", err => {
      console.error("Papertrail transport error:", err);
    });
  }

  debug(message, meta = {}) {
    this.client.debug(this.#format(message, meta));
  }

  info(message, meta = {}) {
    this.client.info(this.#format(message, meta));
  }

  warn(message, meta = {}) {
    this.client.warn(this.#format(message, meta));
  }

  error(message, meta = {}) {
    this.client.error(this.#format(message, meta));
  }

  // private helper to format messages + metadata
  #format(message, meta) {
    if (!meta || Object.keys(meta).length === 0) return message;
    return `${message} | ${JSON.stringify(meta)}`;
  }
}
