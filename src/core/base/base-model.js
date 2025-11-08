// base-model.js

// --------------------------------------------------------------------------
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
  #driver;
  #schema;
  #data = {}; // holds record state

  constructor(driver, config = undefined) {
    super(config);

    // ensure a driver was passed
    if (!driver || typeof driver !== "object") {
      throw new Error(
        `❌ Model requires a valid database driver instance (got ${typeof driver}).`
      );
    }

    const requiredMethods = [
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

    const missing = requiredMethods.filter(
      method => typeof driver[method] !== "function"
    );

    if (missing.length > 0) {
      throw new Error(
        `❌ Invalid driver instance passed to ${
          this.constructor.name
        }. Missing methods: ${missing.join(", ")}`
      );
    }

    this.#driver = driver;
    this.#schema = new Schema();
    this.#name = this.constructor.modelName;

    // Let subclass define schema
    this.defineSchema(this.#schema);

    // Define reactive properties based on schema
    this.#definePropertiesFromSchema();

    // Proxy schema-safe access and assignment
    const validFields = new Set(Object.keys(this.#schema.getSchema()));
    const self = this;

    return new Proxy(this, {
      set(target, prop, value) {
        if (validFields.has(prop) || Reflect.has(target, prop)) {
          target[prop] = value;
          return true;
        }

        throw new Error(
          `❌ Invalid property assignment '${String(prop)}' on model '${
            self.name
          }'. ` + `Valid fields are: ${Array.from(validFields).join(", ")}`
        );
      },

      get(target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }

        if (typeof prop === "string" && !validFields.has(prop)) {
          throw new Error(
            `❌ Invalid property access '${prop}' on model '${self.name}'. ` +
              `Valid fields are: ${Array.from(validFields).join(", ")}`
          );
        }

        return undefined;
      },

      has(target, prop) {
        return Reflect.has(target, prop) || validFields.has(prop);
      },
    });
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

  get driver() {
    return this.#driver;
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
    const record = await this.driver.findById(this.tableName, id);
    if (!record) return null;

    if (mutate) {
      this.#setData(record);
      return this;
    }

    const instance = new this.constructor(this.driver);
    instance.#setData(record);
    return instance;
  }

  async findMany(criteria = {}, { asInstances = true } = {}) {
    const results = await this.driver.findMany(this.tableName, criteria);
    if (!asInstances) return results;

    return results.map(record => {
      const instance = new this.constructor(this.driver);
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
        const result = await this.driver.insertOne(this.tableName, validated);
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
        const result = await this.driver.updateOne(this.tableName, validated);
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
        const result = await this.driver.upsert(this.tableName, validated);
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

    const result = await this.driver.deleteOne(this.tableName, {
      [pkField]: id,
    });
    return { ...this.toObject(), deleted: true, result };
  }

  // -------------------------------------------------------------------------
  // 🧱 Stateless CRUD (for functional usage)
  // -------------------------------------------------------------------------
  async insertOne(entity) {
    return await this.#handleValidationAndExecute(
      "insertOne",
      entity,
      async validated => this.driver.insertOne(this.tableName, validated)
    );
  }

  async updateOne(entity) {
    return await this.#handleValidationAndExecute(
      "updateOne",
      entity,
      async validated => this.driver.updateOne(this.tableName, validated),
      { partial: true }
    );
  }

  async upsertOne(entity) {
    return await this.#handleValidationAndExecute(
      "upsertOne",
      entity,
      async validated => this.driver.upsert(this.tableName, validated)
    );
  }

  // -------------------------------------------------------------------------
  // 🔍 Query / Count / Transaction
  // -------------------------------------------------------------------------
  async count(criteria) {
    return await this.driver.count(this.tableName, criteria);
  }

  async exists(criteria) {
    return await this.driver.exists(this.tableName, criteria);
  }

  async aggregate(pipelineOrCriteria) {
    return await this.driver.aggregate(this.tableName, pipelineOrCriteria);
  }

  async query(rawQuery, options = {}) {
    return await this.driver.query(rawQuery, options);
  }

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
