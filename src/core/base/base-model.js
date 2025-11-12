// -----------------------------------------------------------------------------
// base-model.js
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

    // Verify driver supports all required DB methods (including batch)
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

    // Subclass must define schema
    this.defineSchema(this._schema);

    // Define reactive schema properties
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
  // Define reactive schema properties
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
  // Single-record CRUD Operations
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
    console.log("this._data", this._data);
    const results = this._schema.validate(this._data);
    if (!results.valid) {
      this._logValidationErrors("insert", results.errors);
      throw new ValidationError(this.name, "insert", results.errors);
    }

    const inserted = await this.driver.insertOne(this.tableName, results.value);
    this._setData({ ...results.value, ...inserted });
    return this.toObject();
  }

  async insertOne(data) {
    this._setData(data);
    return this.insert();
  }

  async update() {
    return this._handleValidationAndExecute(
      "update",
      this._data,
      async validated => {
        const result = await this.driver.updateOne(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      },
      { partial: true }
    );
  }

  async updateOne(data) {
    this._setData(data);
    return this.update();
  }

  async upsert() {
    return this._handleValidationAndExecute(
      "upsert",
      this._data,
      async validated => {
        const result = await this.driver.upsert(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Batch CRUD Operations (reuse single-record methods)
  // ---------------------------------------------------------------------------
  async insertMany(records) {
    if (!Array.isArray(records) || !records.length) {
      return [];
    }
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.insert());
    }
    return results;
  }

  async updateMany(records) {
    if (!Array.isArray(records) || !records.length) {
      return [];
    }
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.update());
    }
    return results;
  }

  async upsertMany(records) {
    if (!Array.isArray(records) || !records.length) {
      return [];
    }
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.upsert());
    }
    return results;
  }

  async delete() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    const id = this._data[pk];
    if (!id) throw new Error(`${this.name}.delete() requires a primary key`);

    const result = await this.driver.deleteOne(this.tableName, { [pk]: id });
    return { ...this.toObject(), deleted: true, result };
  }

  async deleteMany(records) {
    if (!Array.isArray(records) || !records.length) {
      return [];
    }
    const results = [];
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";

    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      if (!instance._data[pk]) {
        throw new Error(
          `${this.name}.deleteMany() requires each record to have primary key '${pk}'`
        );
      }
      results.push(await instance.delete());
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Aggregate / Query helpers
  // ---------------------------------------------------------------------------
  count(criteria) {
    return this.driver.count(this.tableName, criteria);
  }

  exists(criteria) {
    return this.driver.exists(this.tableName, criteria);
  }

  aggregate(pipeline) {
    return this.driver.aggregate(this.tableName, pipeline);
  }

  query(rawQuery, options = {}) {
    return this.driver.query(rawQuery, options);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  startTransaction() {
    return this.driver.startTransaction();
  }

  commitTransaction(session) {
    return this.driver.commitTransaction(session);
  }

  rollbackTransaction(session) {
    return this.driver.rollbackTransaction(session);
  }

  transaction(callback) {
    return this.driver.transaction(callback);
  }

  // ---------------------------------------------------------------------------
  // Save (insert or update)
  // ---------------------------------------------------------------------------
  async save() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    return this._data[pk] ? this.update() : this.insert();
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
    return dbAction(results.value);
  }

  _logValidationErrors(method, errors = []) {
    if (!errors?.length) return;
    console.error(`\n⚠️ Validation failed in ${this.name}.${method}():`);
    for (const err of errors) {
      if (typeof err === "string") console.error(`• ${err}`);
      else if (err && typeof err === "object") {
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

  // ---------------------------------------------------------------------------
  // Optional static convenience insert
  // ---------------------------------------------------------------------------
  static async insertOne(driver, data) {
    const instance = new this(driver);
    instance._setData(data);
    return instance.insert();
  }
}
