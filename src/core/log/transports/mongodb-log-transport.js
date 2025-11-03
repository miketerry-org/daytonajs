// logTransportMongoDBB.js:

"use strict";

import LogTransport from "../log-transport.js";
import logLevels from "../log-levels.js";

let MongoClient = null;

export default class MongoDBLogTransport extends LogTransport {
  /**
   * options must contain:
   * {
   *   uri: string,                // MongoDB connection string
   *   dbName: string,             // database name
   *   collection: string,         // collection name
   *   level?: string,             // minimum log level (default "log")
   *   connectOptions?: object,    // optional MongoClient options
   *   indexes?: [object]          // optional array of index specs
   * }
   */
  constructor(options = {}) {
    super("mongodb", options);

    this.uri = options.uri;
    this.dbName = options.dbName;
    this.collectionName = options.collection;
    this.connectOptions = options.connectOptions || {};
    this.indexes = options.indexes || [];

    if (!this.uri) throw new Error("MongoDBLogTransport: 'uri' is required");
    if (!this.dbName)
      throw new Error("MongoDBLogTransport: 'dbName' is required");
    if (!this.collectionName)
      throw new Error("MongoDBLogTransport: 'collection' is required");

    this.client = null;
    this.collection = null;
    this.ready = this.init();
  }

  async init() {
    if (!MongoClient) {
      MongoClient = await import("mongodb");
    }

    this.client = new MongoClient(this.uri, this.connectOptions);
    await this.client.connect();

    const db = this.client.db(this.dbName);
    this.collection = db.collection(this.collectionName);

    // Ensure a few useful indexes (you can customize)
    await this.collection.createIndex({ timestamp: -1 });
    await this.collection.createIndex({ level: 1 });
    await this.collection.createIndex({ message: "text" });

    // user-specified indexes
    if (Array.isArray(this.indexes) && this.indexes.length > 0) {
      for (const idx of this.indexes) {
        await this.collection.createIndex(idx.fields, idx.options || {});
      }
    }

    console.info(
      `[MongoDBLogTransport] Connected to ${this.dbName}.${this.collectionName}`
    );
  }

  async out(entry) {
    await this.ready; // wait for connection if still initializing

    const minLevel = levels[this.level] ?? levels["log"];
    const entryLevel = levels[entry.level] ?? levels["log"];

    if (entryLevel > minLevel) return; // skip if below threshold

    try {
      await this.collection.insertOne({
        timestamp: new Date(entry.timestamp || Date.now()),
        level: entry.level,
        message: entry.message,
        meta: entry.meta ?? null,
      });
    } catch (err) {
      console.error("[MongoDBLogTransport] Failed to insert log:", err);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.collection = null;
    }
  }
}
