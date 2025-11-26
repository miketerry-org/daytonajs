// abstract.js:

export default class Abstract {
  constructor() {
    if (new.target === Abstract) {
      throw new Error(`The class "Abstract" cannot be instantiated!`);
    }
  }

  notImplemented(methodName) {
    throw new Error(
      `The method "${this.constructor.name}.${methodName}" must be overridden!`
    );
  }
}
