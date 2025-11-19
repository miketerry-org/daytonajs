// mongodb-driver.js

import { MongoClient, ObjectId } from "mongodb";
import BaseDriver from "../../base/base-driver.js";
import sqlToMongoDB from "../../utility/sql-to-mongodb.js";

export default class MongoDBDriver extends BaseDriver {
  _client;
  _db;

  constructor(config = {}) {
    super();
    const { database_uri: uri, database_name, options = {} } = config;

    if (!uri || typeof uri !== "string") {
      throw new Error(
        "❌ MongoDBDriver requires a valid 'database_uri' string in config"
      );
    }

    this._client = new MongoClient(uri, options);
    this._db = database_name
      ? this._client.db(database_name)
      : this._client.db();
  }

  static driverName() {
    return "mongodb";
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------
  async connect() {
    if (!this._client.topology || !this._client.topology.isConnected()) {
      await this._client.connect();
    }
    return this._db;
  }

  async disconnect() {
    if (this._client) await this._client.close();
  }

  collection(name) {
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
      await col.createIndex(fields, options);
    }

    console.log(`✅ Ensured indexes for "${table}"`, indexes);
    this._ensuredIndexes.add(table);
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    return this.collection(table).findOne({ _id: new ObjectId(id) });
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

    if (returnFull) {
      const ids = Object.values(result.insertedIds);
      return await col.find({ _id: { $in: ids } }).toArray();
    }
    return Object.values(result.insertedIds);
  }

  async updateOne(table, data, options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);
    if (!data._id) throw new Error("❌ updateOne requires an '_id' field");

    const id = new ObjectId(data._id);
    const { _id, ...updateData } = data;

    const col = this.collection(table);
    await col.updateOne({ _id: id }, { $set: updateData }, { session });

    return returnFull ? await col.findOne({ _id: id }) : { _id: id };
  }

  async updateMany(table, data, whereClause = "", options = {}) {
    const { session = null } = this.normalizeOptions(options);
    const filter = sqlToMongoDB(whereClause);
    const col = this.collection(table);
    const result = await col.updateMany(filter, { $set: data }, { session });
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  async upsert(table, data, options = {}) {
    const { returnFull = false, session = null } =
      this.normalizeOptions(options);
    const id = data._id ? new ObjectId(data._id) : new ObjectId();
    const col = this.collection(table);

    await col.updateOne({ _id: id }, { $set: data }, { upsert: true, session });

    return returnFull ? await col.findOne({ _id: id }) : { _id: id };
  }

  async upsertMany(table, data = [], options = {}) {
    const results = [];
    for (const doc of data) {
      const result = await this.upsert(table, doc, options);
      results.push(result);
    }
    return results;
  }

  async deleteOne(table, whereClause = "", options = {}) {
    const { session = null } = this.normalizeOptions(options);
    const filter = sqlToMongoDB(whereClause);
    const result = await this.collection(table).deleteOne(filter, { session });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(table, whereClause = "", options = {}) {
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
    const count = await this.collection(table).countDocuments(filter, {
      limit: 1,
    });
    return count > 0;
  }

  async aggregate(table, pipeline = []) {
    return this.collection(table).aggregate(pipeline).toArray();
  }

  async query(rawQuery, options = {}) {
    // rawQuery is expected to be a function that receives the collection
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
