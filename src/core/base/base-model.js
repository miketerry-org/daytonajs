// -----------------------------------------------------------------------------
// base-model.js
// -----------------------------------------------------------------------------

import BaseClass from "./base-class.js";
import Schema from "../utility/schema.js";
import pluralize from "pluralize";

// -----------------------------------------------------------------------------
// Validation Error
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Base Model (shared foundation)
// -----------------------------------------------------------------------------
export default class BaseModel extends BaseClass {
  _driver;
  _schema;
  _data = {};
  _name;

  constructor(driver, config = undefined) {
    super(config);

    if (!driver || typeof driver !== "object") {
      throw new Error(
        `❌ Model requires a valid database driver instance (got ${typeof driver}).`
      );
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
    ];

    const missing = required.filter(m => typeof driver[m] !== "function");
    if (missing.length > 0) {
      throw new Error(
        `❌ Invalid driver instance passed to ${
          this.constructor.name
        }. Missing methods: ${missing.join(", ")}`
      );
    }

    this._driver = driver;
    this._schema = new Schema();
    this._name = this.constructor.modelName;

    this.defineSchema(this._schema);
    this._definePropertiesFromSchema();
  }

  // ---------------------------------------------------------------------------
  // Abstract hooks
  // ---------------------------------------------------------------------------
  defineSchema(schema) {
    this.requireOverride("defineSchema");
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------
  static get modelName() {
    const ctorName = this.name ?? "UnnamedModel";
    return ctorName.endsWith("Model") ? ctorName.slice(0, -5) : ctorName;
  }

  static get tableName() {
    const base = this.modelName;
    const snake = base
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      .toLowerCase();
    return pluralize(snake);
  }

  // ---------------------------------------------------------------------------
  // Public getters
  // ---------------------------------------------------------------------------
  get name() {
    return this._name;
  }
  get tableName() {
    return this.constructor.tableName;
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

  // ---------------------------------------------------------------------------
  // Schema helpers
  // ---------------------------------------------------------------------------
  _definePropertiesFromSchema() {
    const schemaFields = this._schema.getSchema?.();
    if (!schemaFields || typeof schemaFields !== "object") {
      console.warn(`⚠️ No schema fields defined for model: ${this._name}`);
      return;
    }

    for (const key of Object.keys(schemaFields)) {
      if (Object.getOwnPropertyDescriptor(this, key)) continue;
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => this._data[key],
        set: val => {
          this._data[key] = val;
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Data utilities
  // ---------------------------------------------------------------------------
  _setData(record) {
    this._data = { ...record };
  }
  toObject() {
    return { ...this._data };
  }
  toJSON() {
    return this.toObject();
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------
  async _handleValidationAndExecute(method, entity, dbAction, options = {}) {
    const results = this._schema.validate(entity, options);
    if (!results.valid) {
      this._logValidationErrors(method, results.errors);
      throw new ValidationError(this.name, method, results.errors);
    }
    return dbAction(results.value);
  }

  _logValidationErrors(method, errors = []) {
    if (!errors?.length) return;
    console.error(`\n⚠️ Validation failed in ${this.name}.${method}():`);
    for (const err of errors) {
      if (typeof err === "string") console.error(`• ${err}`);
      else if (err && typeof err === "object")
        console.error(
          `• Field: ${err.field ?? "?"} → ${err.message ?? "Invalid"}`
        );
      else console.error(`• ${String(err)}`);
    }
    console.error();
  }

  // ---------------------------------------------------------------------------
  // Static serialization helper
  // ---------------------------------------------------------------------------
  static serialize(data) {
    if (Array.isArray(data))
      return data.map(item =>
        item instanceof BaseModel ? item.toObject() : item
      );
    if (data instanceof BaseModel) return data.toObject();
    return data;
  }
}
