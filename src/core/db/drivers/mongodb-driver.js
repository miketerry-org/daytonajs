// mongodb-driver.js

import verify from "../../utility/verify.js";
import BaseDriver from "../../base/base-driver.js";
import DriverRegistry from "../driver-registry.js";

/**
 * MongoDBDriver
 * Implements the BaseDriver interface for MongoDB databases.
 *
 * Key goals:
 * - Database-agnostic schema support (maps `_id` <-> `id`)
 * - Consistent CRUD return signatures
 * - Safe dynamic driver loading
 * - Compatible with transactions (where supported)
 */
export default class MongoDBDriver extends BaseDriver {
  constructor(config) {
    super(config);
    console.log(this.constructor.name);

    this.client = null;
    this.db = null;
    this.session = null;
    this.MongoClient = null;
    this.ObjectId = null;
  }

  /* =============================================================
   * Driver Identity
   * ============================================================= */
  static driverName() {
    return "mongodb";
  }

  /* =============================================================
   * Config Verification
   * ============================================================= */
  verifyConfig(config) {
    console.log("type", typeof verify);
    let results = verify(config)
      .isString("database_uri", true, 5, 2048)
      .isString("database_name", false, 1, 255);

    console.log("a", results);
    console.log("b", results.ok);
    console.log("c", results.errors);
    return results;
  }

  /* =============================================================
   * Table / Collection Naming
   * ============================================================= */
  formatTableName(modelName) {
    return BaseDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return "_id";
  }

  /* =============================================================
   * Dynamic Module Loader
   * ============================================================= */
  async #loadDriver() {
    if (!this.MongoClient || !this.ObjectId) {
      try {
        const mongodb = await import("mongodb");
        this.MongoClient = mongodb.MongoClient;
        this.ObjectId = mongodb.ObjectId;
      } catch (err) {
        throw new Error(
          "Failed to load 'mongodb' package. Please install it with `npm install mongodb`."
        );
      }
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    await this.#loadDriver();

    if (this.client) return; // already connected
    this.verifyConfig(this.config);

    const { database_uri, database_name } = this.config;
    if (!database_uri) {
      throw new Error("MongoDBDriver.connect: `database_uri` is required.");
    }

    this.client = new this.MongoClient(database_uri, {
      ignoreUndefined: true,
    });
    await this.client.connect();

    const dbName =
      database_name ||
      new URL(database_uri).pathname.replace(/^\//, "") ||
      undefined;

    this.db = this.client.db(dbName);
    console.log(`[MongoDBDriver] Connected to database: ${dbName}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("[MongoDBDriver] Disconnected.");
    }
  }

  async destructor() {
    await this.disconnect();
  }

  /* =============================================================
   * Helpers
   * ============================================================= */
  normalizeEntity(entity) {
    if (entity && entity._id && !entity.id) {
      return { ...entity, id: entity._id.toString() };
    }
    return entity;
  }

  toObjectId(id) {
    try {
      return new this.ObjectId(id);
    } catch {
      return id;
    }
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */
  async insertOne(target, entity) {
    const collection = this.db.collection(target);
    const { id, ...rest } = entity;
    const result = await collection.insertOne(rest);
    return this.normalizeEntity({ ...rest, _id: result.insertedId });
  }

  async insertMany(target, entities) {
    const collection = this.db.collection(target);
    const result = await collection.insertMany(entities);
    const inserted = Object.values(result.insertedIds).map((id, i) =>
      this.normalizeEntity({ ...entities[i], _id: id })
    );
    return inserted;
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */
  async findOne(target, criteria) {
    const collection = this.db.collection(target);
    const query = { ...criteria };
    if (query.id) {
      query._id = this.toObjectId(query.id);
      delete query.id;
    }
    const doc = await collection.findOne(query);
    return this.normalizeEntity(doc);
  }

  async findMany(target, criteria = {}) {
    const collection = this.db.collection(target);
    const query = { ...criteria };
    if (query.id) {
      query._id = this.toObjectId(query.id);
      delete query.id;
    }
    const docs = await collection.find(query).toArray();
    return docs.map(d => this.normalizeEntity(d));
  }

  async findById(target, id) {
    const collection = this.db.collection(target);
    const doc = await collection.findOne({ _id: this.toObjectId(id) });
    return this.normalizeEntity(doc);
  }

  async count(target, criteria = {}) {
    const collection = this.db.collection(target);
    return await collection.countDocuments(criteria);
  }

  async exists(target, criteria = {}) {
    const collection = this.db.collection(target);
    const doc = await collection.findOne(criteria, { projection: { _id: 1 } });
    return !!doc;
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */
  async updateOne(target, entity) {
    const collection = this.db.collection(target);
    const id = entity.id || entity._id;
    if (!id)
      throw new Error("updateOne requires an entity with `id` or `_id`.");

    const { _id, id: omitId, ...updates } = entity;
    const result = await collection.updateOne(
      { _id: this.toObjectId(id) },
      { $set: updates }
    );

    return result.modifiedCount > 0
      ? this.normalizeEntity(await this.findById(target, id))
      : null;
  }

  async updateMany(target, entities) {
    const results = [];
    for (const entity of entities) {
      const updated = await this.updateOne(target, entity);
      if (updated) results.push(updated);
    }
    return results;
  }

  async upsert(target, entity) {
    const collection = this.db.collection(target);
    const id = entity.id || entity._id;

    if (!id) {
      const result = await collection.insertOne(entity);
      return this.normalizeEntity({ ...entity, _id: result.insertedId });
    }

    const { _id, id: omitId, ...updates } = entity;
    const result = await collection.updateOne(
      { _id: this.toObjectId(id) },
      { $set: updates },
      { upsert: true }
    );

    return result.upsertedId
      ? this.normalizeEntity({ ...entity, _id: result.upsertedId })
      : this.normalizeEntity(await this.findById(target, id));
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */
  async deleteOne(target, entity) {
    const collection = this.db.collection(target);
    const id = entity.id || entity._id;
    if (!id)
      throw new Error("deleteOne requires an entity with `id` or `_id`.");

    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  async deleteMany(target, entities) {
    const collection = this.db.collection(target);
    const ids = entities.map(e => this.toObjectId(e.id || e._id));
    const result = await collection.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  async deleteAll(target) {
    const collection = this.db.collection(target);
    const result = await collection.deleteMany({});
    return result.deletedCount;
  }

  /* =============================================================
   * Aggregate / Query
   * ============================================================= */
  async aggregate(target, pipelineOrCriteria) {
    const collection = this.db.collection(target);
    const pipeline = Array.isArray(pipelineOrCriteria)
      ? pipelineOrCriteria
      : [pipelineOrCriteria];
    const docs = await collection.aggregate(pipeline).toArray();
    return docs.map(d => this.normalizeEntity(d));
  }

  async query(callback, options = {}) {
    if (typeof callback !== "function") {
      throw new Error(
        "MongoDBDriver.query expects a function that receives the db instance."
      );
    }
    return await callback(this.db, options);
  }

  /* =============================================================
   * Transactions
   * ============================================================= */
  async startTransaction() {
    if (!this.client) throw new Error("MongoDB not connected.");
    this.session = this.client.startSession();
    this.session.startTransaction();
  }

  async commitTransaction() {
    if (this.session) {
      await this.session.commitTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  async rollbackTransaction() {
    if (this.session) {
      await this.session.abortTransaction();
      this.session.endSession();
      this.session = null;
    }
  }
}

// Register driver globally
DriverRegistry.add("mongodb", MongoDBDriver);
