// base-application.js:

import BaseClass from "./base-class.js";

export default class BaseApplication extends BaseClass {
  constructor(config) {
    super(config.server);
  }
}
