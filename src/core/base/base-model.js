// base-model.js:

"use strict";

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import BaseClass from "./base-class.js";
import Schema from "../utility/schema.js";
import pluralize from "pluralize"; // npm install pluralize

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
// Base Model Class
// -----------------------------------------------------------------------------
export default class BaseModel extends BaseClass {
  #name;
  #dbDriver;
  #schema;

  /**
   * @param {object} dbDriver - Database driver or DAO instance.
   * @param {object} [config] - Optional configuration (passed to BaseClass).
   */
  constructor(dbDriver, config = undefined) {
    super(config);

    if (!dbDriver) {
      throw new Error(`Model requires a database driver`);
    }

    this.#dbDriver = dbDriver;
    this.#schema = new Schema();

    // Logical name defaults to the class name without trailing "Model"
    this.#name = this.constructor.modelName;

    // Let subclass define schema using the Schema instance directly
    this.defineSchema(this.#schema);
  }

  // -------------------------------------------------------------------------
  // Abstract schema definition
  // -------------------------------------------------------------------------

  /**
   * Must be implemented by subclasses to define their schema.
   * Example:
   *   defineSchema(schema) {
   *     schema
   *       .addString("name", true)
   *       .addEmail("email", true)
   *       .addTimestamps();
   *   }
   */
  defineSchema(schema) {
    this.requireOverride("defineSchema");
  }

  // -------------------------------------------------------------------------
  // 🧭 Static Name Helpers
  // -------------------------------------------------------------------------

  /**
   * Returns the logical (singular) model name.
   * Example: "ServerConfigModel" → "ServerConfig"
   */
  static get modelName() {
    const ctorName = this.name ?? "UnnamedModel";
    return ctorName.endsWith("Model") ? ctorName.slice(0, -5) : ctorName;
  }

  /**
   * Returns the database table/collection name.
   * Example: "ServerConfigModel" → "server_configs"
   */
  static get tableName() {
    const base = this.modelName;

    // Convert PascalCase → snake_case
    const snake = base
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      .toLowerCase();

    // Use pluralize for proper pluralization (handles irregulars)
    return pluralize(snake);
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

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
  // Core CRUD Operations
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

  async upsert(entity) {
    return await this.#handleValidationAndExecute(
      "upsert",
      entity,
      async validated => this.dbDriver.upsert(this.tableName, validated)
    );
  }

  async deleteOne(entity) {
    return await this.dbDriver.deleteOne(this.tableName, entity);
  }

  async deleteMany(entities) {
    return await this.dbDriver.deleteMany(this.tableName, entities);
  }

  async deleteAll() {
    return await this.dbDriver.deleteAll(this.tableName);
  }

  async findOne(criteria) {
    return await this.dbDriver.findOne(this.tableName, criteria);
  }

  async findMany(criteria) {
    return await this.dbDriver.findMany(this.tableName, criteria);
  }

  async findById(id) {
    return await this.dbDriver.findById(this.tableName, id);
  }

  // -------------------------------------------------------------------------
  // Query & Utility
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

  // -------------------------------------------------------------------------
  // Transaction Support
  // -------------------------------------------------------------------------

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
  // Schema Accessor
  // -------------------------------------------------------------------------

  getSchema() {
    return this.schema.getSchema();
  }

  // -------------------------------------------------------------------------
  // Validation
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
}
