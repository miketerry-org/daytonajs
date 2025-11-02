// base-log-transport.js:

"use strict";

// load all necessary modules
import msg from "../utility/msg.js";

export default class LogTransport {
  constructor(name, options = {}) {
    this.name = name;
    this.level = options.level ?? "log";
  }

  out(entry) {
    throw new Error(msg.outMethodMustBeOveridden);
  }
}
