// base-model.js:

// -----------------------------------------------------------------------------
// Imports
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
// Base Model
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

    // Verify driver supports required DB methods
    const required = [
      "findById",
      "findMany",
      "insertOne",
      "updateOne",
      "upsert",
      "deleteOne",
      "count",
      "exists",
      "aggregate",
      "query",
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

    // Subclass must define schema
    this.defineSchema(this._schema);

    // Define dynamic getters/setters for schema fields
    this._definePropertiesFromSchema();
  }

  // ---------------------------------------------------------------------------
  // To be overridden by subclasses
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
  // Define reactive schema properties (public)
  // ---------------------------------------------------------------------------
  _definePropertiesFromSchema() {
    const schemaFields = this._schema.getSchema?.();
    if (!schemaFields || typeof schemaFields !== "object") {
      console.warn(`⚠️ No schema fields defined for model: ${this._name}`);
      return;
    }

    // Always define dynamic getters/setters for schema fields
    for (const key of Object.keys(schemaFields)) {
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
  // Utilities
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
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async findById(id, { mutate = false } = {}) {
    const record = await this.driver.findById(this.tableName, id);
    if (!record) return null;

    if (mutate) {
      this._setData(record);
      return this;
    }

    const instance = new this.constructor(this.driver);
    instance._setData(record);
    return instance;
  }

  async findMany(criteria = {}, { asInstances = true } = {}) {
    const results = await this.driver.findMany(this.tableName, criteria);
    if (!asInstances) return results;

    return results.map(record => {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      return instance;
    });
  }

  async insert() {
    const results = this._schema.validate(this._data);
    if (!results.valid) {
      this._logValidationErrors("insert", results.errors);
      throw new ValidationError(this.name, "insert", results.errors);
    }

    const inserted = await this._driver.insertOne(
      this.tableName,
      results.value
    );
    this._setData({ ...results.value, ...inserted });
    return this.toObject();
  }

  async update() {
    return await this._handleValidationAndExecute(
      "update",
      this._data,
      async validated => {
        const result = await this._driver.updateOne(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      },
      { partial: true }
    );
  }

  async upsert() {
    return await this._handleValidationAndExecute(
      "upsert",
      this._data,
      async validated => {
        const result = await this._driver.upsert(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      }
    );
  }

  async save() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    if (this._data[pk]) return this.update();
    return this.insert();
  }

  async delete() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    const id = this._data[pk];
    if (!id) throw new Error(`${this.name}.delete() requires a primary key`);

    const result = await this.driver.deleteOne(this.tableName, { [pk]: id });
    return { ...this.toObject(), deleted: true, result };
  }

  async count(criteria) {
    return await this.driver.count(this.tableName, criteria);
  }

  async exists(criteria) {
    return await this.driver.exists(this.tableName, criteria);
  }

  async aggregate(pipeline) {
    return await this.driver.aggregate(this.tableName, pipeline);
  }

  async query(rawQuery, options = {}) {
    return await this.driver.query(rawQuery, options);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  async transaction(callback) {
    return await this.driver.transaction(callback);
  }

  async startTransaction() {
    return await this.driver.startTransaction();
  }

  async commitTransaction() {
    return await this.driver.commitTransaction();
  }

  async rollbackTransaction() {
    return await this.driver.rollbackTransaction();
  }

  // ---------------------------------------------------------------------------
  // Validation + Logging
  // ---------------------------------------------------------------------------
  async _handleValidationAndExecute(method, entity, dbAction, options = {}) {
    const results = this._schema.validate(entity, options);
    if (!results.valid) {
      this._logValidationErrors(method, results.errors);
      throw new ValidationError(this.name, method, results.errors);
    }
    return await dbAction(results.value);
  }

  _logValidationErrors(method, errors = []) {
    if (!errors?.length) return;
    console.error(`\n⚠️ Validation failed in ${this.name}.${method}():`);
    for (const err of errors) {
      if (typeof err === "string") {
        console.error(`• ${err}`);
      } else if (err && typeof err === "object") {
        console.error(
          `• Field: ${err.field ?? "?"} → ${err.message ?? "Invalid"}`
        );
      } else {
        console.error(`• ${String(err)}`);
      }
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
