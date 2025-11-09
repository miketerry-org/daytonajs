// -----------------------------------------------------------------------------
// mongodb-driver.js
// -----------------------------------------------------------------------------
import { MongoClient, ObjectId } from "mongodb";
import BaseDriver from "../../base/base-driver.js";

export default class MongoDBDriver extends BaseDriver {
  _client;
  _db;

  /**
   * config: {
   *   database_uri: string,  // Full MongoDB URI including database
   *   options: object        // Optional MongoClient options
   * }
   */
  constructor(config = {}) {
    super(config);

    const { database_uri: uri, options = {} } = config;

    if (!uri || typeof uri !== "string") {
      throw new Error(
        "MongoDBDriver requires a valid 'database_uri' string in config"
      );
    }

    this._client = new MongoClient(uri, options);
    // Use the database specified in the URI
    this._db = this._client.db();
  }

  // ---------------------------------------------------------------------------
  // Connection
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Collection / Table access
  // ---------------------------------------------------------------------------
  collection(name) {
    return this._db.collection(name);
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    return this.collection(table).findOne({ _id: new ObjectId(id) });
  }

  async findMany(table, criteria = {}) {
    return this.collection(table).find(criteria).toArray();
  }

  async insertOne(table, document) {
    const result = await this.collection(table).insertOne(document);
    return { _id: result.insertedId };
  }

  async insertMany(table, documents) {
    const result = await this.collection(table).insertMany(documents);
    return Object.keys(result.insertedIds).map(i => ({
      _id: result.insertedIds[i],
    }));
  }

  async updateOne(table, document) {
    const pk = "_id";
    if (!document[pk]) throw new Error("updateOne requires _id");
    const id = new ObjectId(document[pk]);
    const { matchedCount } = await this.collection(table).updateOne(
      { _id: id },
      { $set: document }
    );
    return { matchedCount };
  }

  async updateMany(table, documents) {
    const results = [];
    for (const doc of documents) {
      const result = await this.updateOne(table, doc);
      results.push(result);
    }
    return results;
  }

  async upsert(table, document) {
    const pk = "_id";
    const id = document[pk] ? new ObjectId(document[pk]) : new ObjectId();
    const result = await this.collection(table).updateOne(
      { _id: id },
      { $set: document },
      { upsert: true }
    );
    return { _id: id, upsertedCount: result.upsertedCount };
  }

  async upsertMany(table, documents) {
    const results = [];
    for (const doc of documents) {
      const result = await this.upsert(table, doc);
      results.push(result);
    }
    return results;
  }

  async deleteOne(table, criteria) {
    const id = criteria._id ? new ObjectId(criteria._id) : undefined;
    const result = await this.collection(table).deleteOne({ _id: id });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(table, ids) {
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await this.collection(table).deleteMany({
      _id: { $in: objectIds },
    });
    return { deletedCount: result.deletedCount };
  }

  async count(table, criteria = {}) {
    return this.collection(table).countDocuments(criteria);
  }

  async exists(table, criteria = {}) {
    const count = await this.collection(table).countDocuments(criteria, {
      limit: 1,
    });
    return count > 0;
  }

  async aggregate(table, pipeline = []) {
    return this.collection(table).aggregate(pipeline).toArray();
  }

  async query(rawQuery, options = {}) {
    return rawQuery(this.collection(options.table));
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
        result = await callback();
      });
    } finally {
      session.endSession();
    }
    return result;
  }
}
