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
// Base Model Class (Hybrid ActiveRecord + Functional)
// -----------------------------------------------------------------------------
export default class BaseModel extends BaseClass {
  #name;
  #dbDriver;
  #schema;
  #data = {}; // holds record state

  constructor(dbDriver, config = undefined) {
    super(config);

    if (!dbDriver) {
      throw new Error(`Model requires a database driver`);
    }

    this.#dbDriver = dbDriver;
    this.#schema = new Schema();
    this.#name = this.constructor.modelName;

    // Let subclass define schema
    this.defineSchema(this.#schema);

    // Define reactive properties
    this.#definePropertiesFromSchema();
  }

  // -------------------------------------------------------------------------
  // Abstract schema definition
  // -------------------------------------------------------------------------
  defineSchema(schema) {
    this.requireOverride("defineSchema");
  }

  // -------------------------------------------------------------------------
  // 🧭 Static Name Helpers
  // -------------------------------------------------------------------------
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

  get name() {
    return this.#name ?? this.constructor.modelName;
  }

  get tableName() {
    return this.constructor.tableName;
  }

  get schema() {
    return this.#schema;
  }

  get dbDriver() {
    return this.#dbDriver;
  }

  // -------------------------------------------------------------------------
  // 🔧 Schema → Dynamic Properties
  // -------------------------------------------------------------------------
  #definePropertiesFromSchema() {
    const fields = this.#schema.getSchema();
    for (const [key] of Object.entries(fields)) {
      if (Object.hasOwn(this, key)) continue;
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => this.#data[key],
        set: val => {
          this.#data[key] = val;
        },
      });
    }
  }

  #setData(record) {
    this.#data = { ...record };
  }

  toObject() {
    return { ...this.#data };
  }

  // Smart serialization for Express / JSON
  toJSON() {
    return this.toObject();
  }

  // -------------------------------------------------------------------------
  // 🧩 Instance-Based Finders
  // -------------------------------------------------------------------------
  async findById(id, { mutate = false } = {}) {
    const record = await this.dbDriver.findById(this.tableName, id);
    if (!record) return null;

    if (mutate) {
      this.#setData(record);
      return this;
    }

    const instance = new this.constructor(this.dbDriver);
    instance.#setData(record);
    return instance;
  }

  async findMany(criteria = {}, { asInstances = true } = {}) {
    const results = await this.dbDriver.findMany(this.tableName, criteria);
    if (!asInstances) return results;

    return results.map(record => {
      const instance = new this.constructor(this.dbDriver);
      instance.#setData(record);
      return instance;
    });
  }

  // -------------------------------------------------------------------------
  // 💾 ActiveRecord-Style CRUD
  // -------------------------------------------------------------------------
  async insert() {
    return await this.#handleValidationAndExecute(
      "insert",
      this.#data,
      async validated => {
        const result = await this.dbDriver.insertOne(this.tableName, validated);
        this.#setData({ ...validated, ...result });
        return this.toObject();
      }
    );
  }

  async update() {
    return await this.#handleValidationAndExecute(
      "update",
      this.#data,
      async validated => {
        const result = await this.dbDriver.updateOne(this.tableName, validated);
        this.#setData({ ...validated, ...result });
        return this.toObject();
      },
      { partial: true }
    );
  }

  async upsert() {
    return await this.#handleValidationAndExecute(
      "upsert",
      this.#data,
      async validated => {
        const result = await this.dbDriver.upsert(this.tableName, validated);
        this.#setData({ ...validated, ...result });
        return this.toObject();
      }
    );
  }

  async save() {
    const pkField = this.#schema.getPrimaryKeyField?.() ?? "id";
    if (this.#data[pkField]) return await this.update();
    return await this.insert();
  }

  async delete() {
    const pkField = this.#schema.getPrimaryKeyField?.() ?? "id";
    const id = this.#data[pkField];
    if (!id) throw new Error(`${this.name}.delete() requires a primary key`);

    const result = await this.dbDriver.deleteOne(this.tableName, {
      [pkField]: id,
    });
    return { ...this.toObject(), deleted: true, result };
  }

  // -------------------------------------------------------------------------
  // 🧱 Stateless CRUD (for compatibility)
  // -------------------------------------------------------------------------
  async insertOne(entity) {
    return await this.#handleValidationAndExecute(
      "insertOne",
      entity,
      async validated => this.dbDriver.insertOne(this.tableName, validated)
    );
  }

  async updateOne(entity) {
    return await this.#handleValidationAndExecute(
      "updateOne",
      entity,
      async validated => this.dbDriver.updateOne(this.tableName, validated),
      { partial: true }
    );
  }

  async upsertOne(entity) {
    return await this.#handleValidationAndExecute(
      "upsertOne",
      entity,
      async validated => this.dbDriver.upsert(this.tableName, validated)
    );
  }

  // -------------------------------------------------------------------------
  // 🔍 Query / Count / Transaction
  // -------------------------------------------------------------------------
  async count(criteria) {
    return await this.dbDriver.count(this.tableName, criteria);
  }

  async exists(criteria) {
    return await this.dbDriver.exists(this.tableName, criteria);
  }

  async aggregate(pipelineOrCriteria) {
    return await this.dbDriver.aggregate(this.tableName, pipelineOrCriteria);
  }

  async query(rawQuery, options = {}) {
    return await this.dbDriver.query(rawQuery, options);
  }

  async transaction(callback) {
    return await this.dbDriver.transaction(callback);
  }

  async startTransaction() {
    return await this.dbDriver.startTransaction();
  }

  async commitTransaction() {
    return await this.dbDriver.commitTransaction();
  }

  async rollbackTransaction() {
    return await this.dbDriver.rollbackTransaction();
  }

  // -------------------------------------------------------------------------
  // ✅ Validation + Logging
  // -------------------------------------------------------------------------
  async #handleValidationAndExecute(method, entity, dbAction, options = {}) {
    const results = this.#validateEntity(entity, options);
    if (!results.valid) {
      this.#logValidationErrors(method, results.errors);
      throw new ValidationError(this.name, method, results.errors);
    }
    return await dbAction(results.value);
  }

  #validateEntity(entity, options = {}) {
    return this.schema.validate(entity, options);
  }

  #logValidationErrors(method, errors = []) {
    if (!errors?.length) return;
    console.error(`\n⚠️ Validation failed in ${this.name}.${method}():`);
    console.error("--------------------------------------------------");
    for (const err of errors) {
      if (typeof err === "string") {
        console.error(`• ${err}`);
      } else if (err && typeof err === "object") {
        const { field, message, expected, received } = err;
        console.error(
          `• Field: ${field ?? "?"} → ${message ?? "Invalid"} (expected: ${
            expected ?? "?"
          }, got: ${received ?? "?"})`
        );
      } else {
        console.error(`• ${String(err)}`);
      }
    }
    console.error("--------------------------------------------------\n");
  }

  // -------------------------------------------------------------------------
  // 🌟 Static Serialization Helper
  // -------------------------------------------------------------------------
  static serialize(data) {
    if (Array.isArray(data)) {
      return data.map(item =>
        item instanceof BaseModel ? item.toObject() : item
      );
    }
    if (data instanceof BaseModel) {
      return data.toObject();
    }
    return data;
  }
}
