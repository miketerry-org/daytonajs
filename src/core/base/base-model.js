// -----------------------------------------------------------------------------
// base-model.js (Driver-API–corrected)
// -----------------------------------------------------------------------------

import BaseClass from "./base-class.js";
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

export default class BaseModel extends BaseClass {
  _driver;
  _tableName;
  _schema;
  _data = {};
  _name;

  constructor(driver, tableName, schema, config = {}) {
    super(config);

    if (!driver || typeof driver !== "object") {
      throw new Error(
        `❌ BaseModel requires a valid database driver instance.`
      );
    }

    // DRIVER API VALIDATION
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
    if (missing.length)
      throw new Error(
        `❌ Invalid driver passed to BaseModel. Missing: ${missing.join(", ")}`
      );

    if (typeof tableName !== "string")
      throw new Error(`❌ BaseModel requires a valid table name (string).`);

    if (!(schema instanceof Schema))
      throw new Error(`❌ BaseModel requires a Schema instance.`);

    this._driver = driver;
    this._tableName = tableName;
    this._schema = schema;
    this._name = this.constructor.modelName;

    this._definePropertiesFromSchema();

    // AUTO-ENSURE INDEXES
    this._driver.ensureIndexes(this._tableName, this._schema);
  }

  static get modelName() {
    const name = this.name ?? "UnnamedModel";
    return name.endsWith("Model") ? name.slice(0, -5) : name;
  }

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

  _definePropertiesFromSchema() {
    const fields = this._schema.getSchema?.();
    if (!fields) return;

    for (const key of Object.keys(fields)) {
      if (Object.getOwnPropertyDescriptor(this, key)) continue;
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

  async _handleValidationAndExecute(method, entity, action, options = {}) {
    const results = this._schema.validate(this._tableName, entity, options);

    if (!results.valid) {
      this._logValidationErrors(method, results.errors);
      throw new ValidationError(this._name, method, results.errors);
    }

    return action(results.value);
  }

  _logValidationErrors(method, errors = []) {
    if (!errors.length) return;
    console.error(`\n⚠️ Validation failed in ${this._name}.${method}():`);
    errors.forEach(err => {
      if (typeof err === "string") console.error(`• ${err}`);
      else if (err?.field) console.error(`• ${err.field}: ${err.message}`);
      else console.error(`• ${String(err)}`);
    });
    console.error();
  }

  static serialize(data) {
    if (Array.isArray(data))
      return data.map(d => (d instanceof BaseModel ? d.toObject() : d));
    if (data instanceof BaseModel) return data.toObject();
    return data;
  }
}
