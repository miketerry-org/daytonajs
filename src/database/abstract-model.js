// abstractModel.js:

import Abstract from "../utility/abstract.js";
import Schema from "../utility/schema.js";

export class ValidationError extends Error {
  constructor(model, method, errors = []) {
    super(
      `${model}.${method}() failed validation with ${errors.length} error(s).`
    );
    this.name = "ValidationError";
    this.model = model;
    this.method = method;
    this.errors = errors;
  }
}

export default class AbstractModel extends Abstract {
  _driver;
  _tableName;
  _schema;
  _data = {};
  _name;

  constructor(driver, tableName, schema) {
    super();

    // ------------------------------------------------------------
    // DRIVER VALIDATION
    // ------------------------------------------------------------
    if (!driver || typeof driver !== "object") {
      throw new Error(`BaseModel requires a valid database driver instance.`);
    }

    const required = [
      "findById",
      "findMany",
      "insertOne",
      "insertMany",
      "updateOne",
      "updateMany",
      "upsert",
      "upsertMany",
      "deleteOne",
      "deleteMany",
      "count",
      "exists",
      "aggregate",
      "query",
      "transaction",
      "startTransaction",
      "commitTransaction",
      "rollbackTransaction",
      "ensureIndexes",
      "normalizeOptions",
    ];

    const missing = required.filter(m => typeof driver[m] !== "function");
    if (missing.length) {
      throw new Error(
        `Invalid driver passed to BaseModel. Missing: ${missing.join(", ")}`
      );
    }

    if (typeof tableName !== "string") {
      throw new Error(`BaseModel requires a valid table name (string).`);
    }

    if (!(schema instanceof Schema)) {
      throw new Error(`BaseModel requires a Schema instance.`);
    }

    // ------------------------------------------------------------
    // REQUIRE: static modelName()
    // ------------------------------------------------------------
    if (this.constructor.modelName === AbstractModel.modelName) {
      throw new Error(
        `Model "${this.constructor.name}" must implement:\n` +
          `   static modelName() { return "<Name>"; }\n\nExample:\n` +
          `   class User extends BaseModel {\n` +
          `     static modelName() { return "User"; }\n` +
          `   }`
      );
    }

    // Store model name
    this._name = this.constructor.modelName();

    // ------------------------------------------------------------
    // ASSIGN INTERNAL STATE
    // ------------------------------------------------------------
    this._driver = driver;
    this._tableName = tableName;
    this._schema = schema;

    this._definePropertiesFromSchema();

    // Auto-ensure indexes
    this._driver.ensureIndexes(this._tableName, this._schema);
  }

  // ============================================================
  // ABSTRACT modelName()
  // ============================================================

  static modelName() {
    this.notImplemented("modelName");
  }

  // ============================================================
  // INSTANCE ACCESSORS
  // ============================================================

  get name() {
    return this._name;
  }

  get tableName() {
    return this._tableName;
  }

  get schema() {
    return this._schema;
  }

  get driver() {
    return this._driver;
  }

  get data() {
    return { ...this._data };
  }

  // ============================================================
  // SCHEMA-DRIVEN FIELD GETTERS/SETTERS
  // ============================================================

  _definePropertiesFromSchema() {
    const fields = this._schema.getSchema?.();
    if (!fields) {
      return;
    }

    for (const key of Object.keys(fields)) {
      if (Object.getOwnPropertyDescriptor(this, key)) {
        continue;
      }

      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => this._data[key],
        set: v => {
          this._data[key] = v;
        },
      });
    }
  }

  _setData(record) {
    this._data = { ...record };
  }

  toObject() {
    return { ...this._data };
  }

  toJSON() {
    return this.toObject();
  }

  // ============================================================
  // VALIDATION WRAPPER
  // ============================================================

  async _handleValidationAndExecute(method, entity, action, options = {}) {
    const results = this._schema.validate(this._tableName, entity, options);

    if (!results.valid) {
      this._logValidationErrors(method, results.errors);
      throw new ValidationError(this._name, method, results.errors);
    }

    return action(results.value);
  }

  _logValidationErrors(method, errors = []) {
    if (!errors.length) {
      return;
    }

    system.log.debug(`\n⚠️ Validation failed in ${this._name}.${method}():`);
    errors.forEach(err => {
      if (typeof err === "string") {
        system.log.debug(`• ${err}`);
      } else if (err?.field) {
        system.log.debug(`• ${err.field}: ${err.message}`);
      } else {
        system.log.debug(`• ${String(err)}`);
      }
    });
    system.log.debug();
  }

  // ============================================================
  // STATIC UTILITIES
  // ============================================================

  static serialize(data) {
    if (Array.isArray(data))
      return data.map(d => (d instanceof BaseModel ? d.toObject() : d));

    if (data instanceof BaseModel) return data.toObject();

    return data;
  }
}
