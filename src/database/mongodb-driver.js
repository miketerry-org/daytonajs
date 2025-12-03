// mongodb-driver.js

import AbstractDriver from "./abstract-driver.js";
import parseDatabaseURI from "../utility/parse-database-uri.js";
import sqlToMongoDB from "../utility/sql-to-mongodb.js";
import { MongoClient, ObjectId } from "mongodb";

export default class MongoDBDriver extends AbstractDriver {
  _client = null;
  _db = null;
  _ensuredIndexes = new Set();

  constructor() {
    super();

    // ------------------------------------------------------------
    // Load global config (system is injected globally)
    // ------------------------------------------------------------
    const uri = system.server.getString("database_uri"); // required
    const configOptions = system.server.getObject("database_options", {});

    // ------------------------------------------------------------
    // Parse URI
    // ------------------------------------------------------------
    const parsed = parseDatabaseURI(uri);
    if (!parsed.database) {
      throw new Error("MongoDBDriver: database name missing in database_uri.");
    }

    // ------------------------------------------------------------
    // Create client + DB accessor
    // ------------------------------------------------------------
    this._client = new MongoClient(uri, configOptions);
    this._db = this._client.db(parsed.database);
  }

  static driverName() {
    return "mongodb";
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------
  async connect() {
    // Prevent multiple connection warnings
    if (!this._client.topology || !this._client.topology.isConnected()) {
      await this._client.connect();
    }
    return this._db;
  }

  async disconnect() {
    if (this._client) {
      await this._client.close();
    }
  }

  collection(name) {
    if (!name)
      throw new Error("MongoDBDriver.collection() requires a collection name.");
    return this._db.collection(name);
  }

  // ---------------------------------------------------------------------------
  // Index management
  // ---------------------------------------------------------------------------
  async ensureIndexes(table, schema) {
    if (this._ensuredIndexes.has(table)) return;

    const indexes = schema?.getIndexes?.() || [];
    const col = this.collection(table);

    for (const idx of indexes) {
      const { fields, options } = idx;
      try {
        await col.createIndex(fields, { background: true, ...options });
      } catch (err) {
        // Ignore "index already exists" errors; rethrow others
        if (!/already exists|E11000/.test(err.message)) throw err;
      }
    }

    system.log.debug?.(`Ensured indexes for "${table}"`);
    this._ensuredIndexes.add(table);
  }

  // ---------------------------------------------------------------------------
  // Utility: safe ObjectId conversion
  // ---------------------------------------------------------------------------
  toObjectId(id) {
    if (id instanceof ObjectId) return id;
    if (ObjectId.isValid(id)) return new ObjectId(id);
    throw new Error(`Invalid ObjectId: ${id}`);
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    const oid = this.toObjectId(id);
    return this.collection(table).findOne({ _id: oid });
  }

  async findMany(table, whereClause = "") {
    const filter = sqlToMongoDB(whereClause);
    return this.collection(table).find(filter).toArray();
  }

  async insertOne(table, data, options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);

    const col = this.collection(table);
    const result = await col.insertOne(data, { session });

    return returnFull
      ? await col.findOne({ _id: result.insertedId })
      : { _id: result.insertedId };
  }

  async insertMany(table, data = [], options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);

    const col = this.collection(table);
    const result = await col.insertMany(data, { session });

    const ids = Object.values(result.insertedIds);
    return returnFull ? await col.find({ _id: { $in: ids } }).toArray() : ids;
  }

  async updateOne(table, data, options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);

    if (!data._id) throw new Error("updateOne requires an '_id' field.");

    const oid = this.toObjectId(data._id);

    const { _id, ...updateData } = data;

    const col = this.collection(table);
    await col.updateOne({ _id: oid }, { $set: updateData }, { session });

    return returnFull ? await col.findOne({ _id: oid }) : { _id: oid };
  }

  async updateMany(table, data, whereClause = "", options = {}) {
    const { session = null } = this.normalizeOptions(options);

    const filter = sqlToMongoDB(whereClause);

    // Prevent accidental _id mutation
    const { _id, ...updateData } = data;

    const col = this.collection(table);
    const result = await col.updateMany(
      filter,
      { $set: updateData },
      { session }
    );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  async upsert(table, data, options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);

    const id = data._id ? this.toObjectId(data._id) : new ObjectId();
    const { _id, ...doc } = data;

    const col = this.collection(table);

    await col.updateOne({ _id: id }, { $set: doc }, { upsert: true, session });

    return returnFull ? await col.findOne({ _id: id }) : { _id: id };
  }

  async upsertMany(table, data = [], options = {}) {
    const results = [];
    for (const doc of data) {
      results.push(await this.upsert(table, doc, options));
    }
    return results;
  }

  async deleteOne(table, whereClause = "", options = {}) {
    if (!whereClause)
      throw new Error(
        "deleteOne requires a whereClause (empty would delete arbitrary document)."
      );

    const { session = null } = this.normalizeOptions(options);
    const filter = sqlToMongoDB(whereClause);

    const result = await this.collection(table).deleteOne(filter, { session });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(table, whereClause = "", options = {}) {
    if (!whereClause)
      throw new Error(
        "deleteMany requires a whereClause to avoid accidental full-collection deletion."
      );

    const { session = null } = this.normalizeOptions(options);
    const filter = sqlToMongoDB(whereClause);

    const result = await this.collection(table).deleteMany(filter, { session });
    return { deletedCount: result.deletedCount };
  }

  async count(table, whereClause = "") {
    const filter = sqlToMongoDB(whereClause);
    return this.collection(table).countDocuments(filter);
  }

  async exists(table, whereClause = "") {
    const filter = sqlToMongoDB(whereClause);
    const doc = await this.collection(table).findOne(filter, {
      projection: { _id: 1 },
    });
    return !!doc;
  }

  async aggregate(table, pipeline = []) {
    return this.collection(table).aggregate(pipeline).toArray();
  }

  async query(rawQuery, options = {}) {
    if (!options.table) throw new Error("query() requires options.table");

    return rawQuery(this.collection(options.table), options);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  async startTransaction() {
    const session = this._client.startSession();
    session.startTransaction();
    return session;
  }

  async commitTransaction(session) {
    await session.commitTransaction();
    session.endSession();
  }

  async rollbackTransaction(session) {
    await session.abortTransaction();
    session.endSession();
  }

  async transaction(callback) {
    const session = this._client.startSession();
    let result;

    try {
      await session.withTransaction(async () => {
        result = await callback({ session });
      });
    } finally {
      session.endSession();
    }

    return result;
  }
}
