// mongodb-driver.js

import { MongoClient, ObjectId } from "mongodb";
import BaseDriver from "../../base/base-driver.js";
import sqlToMongoDB from "../../utility/sql-to-mongodb.js";

export default class MongoDBDriver extends BaseDriver {
  _client;
  _db;
  _ensuredIndexes = new Set();

  constructor(config = {}) {
    super(config);
    const { database_uri: uri, options = {} } = config;

    if (!uri || typeof uri !== "string") {
      throw new Error(
        "MongoDBDriver requires a valid 'database_uri' string in config"
      );
    }

    this._client = new MongoClient(uri, options);
    this._db = this._client.db();
  }

  async connect() {
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
    return this._db.collection(name);
  }

  async ensureIndexes(table, schema) {
    if (this._ensuredIndexes.has(table)) return;

    const indexes = schema.getIndexes?.() || [];
    const col = this.collection(table);
    for (const idx of indexes) {
      const { fields, options } = idx;
      await col.createIndex(fields, options);
    }
    this._ensuredIndexes.add(table);
  }

  hasEnsuredIndexesFor(table) {
    return this._ensuredIndexes.has(table);
  }

  async findById(table, id) {
    return this.collection(table).findOne({ _id: new ObjectId(id) });
  }

  async findMany(table, whereClause = "") {
    const filter = sqlToMongoDB(whereClause);
    return this.collection(table).find(filter).toArray();
  }

  // ---------------------------------------------------------------------------
  // Insert
  // ---------------------------------------------------------------------------
  async insertOne(table, schema, data, options = {}) {
    const { returnFull = false, strict = true, session = null } = options;

    const validation = schema.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    let document = validation.value;
    if (strict) {
      const allowedFields = Object.keys(schema.getSchema());
      document = Object.fromEntries(
        Object.entries(document).filter(([key]) => allowedFields.includes(key))
      );
    }

    const col = this.collection(table);
    const result = await col.insertOne(document, { session });

    if (returnFull) {
      return await col.findOne({ _id: result.insertedId });
    }

    return { _id: result.insertedId };
  }

  async insertMany(table, schema, data = [], options = {}) {
    const { returnFull = false, strict = true, session = null } = options;

    const documents = data.map(d => {
      const validation = schema.validate(d);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }
      let doc = validation.value;
      if (strict) {
        const allowedFields = Object.keys(schema.getSchema());
        doc = Object.fromEntries(
          Object.entries(doc).filter(([key]) => allowedFields.includes(key))
        );
      }
      return doc;
    });

    const col = this.collection(table);
    const result = await col.insertMany(documents, { session });

    if (returnFull) {
      const ids = Object.values(result.insertedIds);
      return await col.find({ _id: { $in: ids } }).toArray();
    }

    return Object.values(result.insertedIds);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  async updateOne(table, schema, data, options = {}) {
    const { returnFull = false, strict = true, session = null } = options;
    const pk = "_id";

    if (!data[pk]) throw new Error("updateOne requires _id");

    const id = new ObjectId(data[pk]);

    const validation = schema.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    let document = validation.value;
    if (strict) {
      const allowedFields = Object.keys(schema.getSchema());
      document = Object.fromEntries(
        Object.entries(document).filter(([key]) => allowedFields.includes(key))
      );
    }

    const col = this.collection(table);
    await col.updateOne({ _id: id }, { $set: document }, { session });

    if (returnFull) {
      return await col.findOne({ _id: id });
    }

    return { _id: id };
  }

  async updateMany(table, schema, data, whereClause = "", options = {}) {
    const { strict = true, session = null } = options;

    const validation = schema.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    let updateData = validation.value;
    if (strict) {
      const allowedFields = Object.keys(schema.getSchema());
      updateData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) =>
          allowedFields.includes(key)
        )
      );
    }

    const filter = sqlToMongoDB(whereClause);
    const result = await this.collection(table).updateMany(
      filter,
      { $set: updateData },
      { session }
    );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Upsert
  // ---------------------------------------------------------------------------
  async upsert(table, schema, data, options = {}) {
    const { returnFull = false, strict = true, session = null } = options;
    const pk = "_id";

    const validation = schema.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    let document = validation.value;
    if (strict) {
      const allowedFields = Object.keys(schema.getSchema());
      document = Object.fromEntries(
        Object.entries(document).filter(([key]) => allowedFields.includes(key))
      );
    }

    const id = document[pk] ? new ObjectId(document[pk]) : new ObjectId();
    const col = this.collection(table);

    await col.updateOne(
      { _id: id },
      { $set: document },
      { upsert: true, session }
    );

    if (returnFull) {
      return await col.findOne({ _id: id });
    }

    return { _id: id };
  }

  async upsertMany(table, schema, data = [], options = {}) {
    const results = [];
    for (const doc of data) {
      const result = await this.upsert(table, schema, doc, options);
      results.push(result);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Delete / Count / Exists / Aggregate
  // ---------------------------------------------------------------------------
  async deleteOne(table, whereClause = "", options = {}) {
    const { session = null } = options;
    const filter = sqlToMongoDB(whereClause);
    const result = await this.collection(table).deleteOne(filter, { session });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(table, whereClause = "", options = {}) {
    const { session = null } = options;
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
