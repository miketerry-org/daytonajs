// mongo-logger.js
import { MongoClient } from "mongodb";
import AbstractLogger from "./abstract-logger.js";

export default class MongoDBLogger extends AbstractLogger {
  /**
   * @param {Object} options
   * @param {string} options.uri - MongoDB connection URI
   * @param {string} options.dbName - database name
   * @param {string} [options.collectionName='logs'] - collection name
   * @param {string} [options.level='debug'] - minimum log level
   */
  constructor({ uri, dbName, collectionName = "logs", level = "debug" }) {
    super(level);

    if (!uri || !dbName) {
      throw new Error("MongoDBLogger requires 'uri' and 'dbName'");
    }

    this.uri = uri;
    this.dbName = dbName;
    this.collectionName = collectionName;

    this.client = new MongoClient(this.uri, { useUnifiedTopology: true });
    this.connected = false;

    // Connect immediately
    this.connect().catch(err => {
      console.error("Failed to connect to MongoDB:", err);
    });
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      this.connected = true;
    }
  }

  /**
   * Insert log entry into MongoDB
   * @param {string} level
   * @param {string} message
   * @param {object} meta
   */
  async log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    try {
      await this.connect();

      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        meta,
      };

      await this.collection.insertOne(logEntry);
    } catch (err) {
      // fallback to console if MongoDB write fails
      console.error("Failed to write log to MongoDB:", err);

      // Correct optional chaining fallback
      console[level]?.(message, meta) ?? console.log(level, message, meta);
    }
  }

  /**
   * Close the MongoDB connection
   */
  async close() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}
