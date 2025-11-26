// abstract-logger.js

class Abstract {
  constructor() {
    if (this.constructor.name === "Abstract") {
      throw new Error(`The class "Abstract" cannot directly be instanciated!`);
    }
  }

  notImplemented(methodName) {
    throw new Error(
      `The "${this.constructor.name}.${methodName}" must be overridden!`
    );
  }
}

class AbstractLogger extends Abstract {
  constructor() {
    super();
  }

  debug(message, meta = {}) {
    this.notImplemented("debug");
  }

  info(message, meta = {}) {
    this.notImplemented("info");
  }

  warn(message, meta = {}) {
    this.notImplemented("warn");
  }

  error(message, meta = {}) {
    this.notImplemented("error");
  }

  // private helper to format messages + metadata
  format(message, meta) {
    if (!meta || Object.keys(meta).length === 0) return message;
    return `${message} | ${JSON.stringify(meta)}`;
  }
}

class ConsoleLogger extends AbstractLogger {
  debug(message, meta = {}) {
    console.debug(this.format(message, meta));
  }

  info(message, meta = {}) {
    console.info(this.format(message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.format(message, meta));
  }

  error(message, meta = {}) {
    console.error(this.format(message, meta));
  }
}
