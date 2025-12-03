// abstract-driver.js

import Abstract from "../utility/abstract.js";

export default class AbstractDriver extends Abstract {
  constructor() {
    super();
    this._ensuredIndexes = new Set();
  }

  static driverName() {
    this.notImplemented("driverName");
  }

  ensureIndexes(tableName, schema) {
    if (this._ensuredIndexes.has(tableName)) {
      return;
    }
    const indexes = schema.getIndexes?.();
    if (!indexes || !indexes.length) {
      return;
    }
    system.log.debug(`✅ Ensuring indexes for table "${tableName}":`, indexes);
    this._ensuredIndexes.add(tableName);
  }

  hasEnsuredIndexesFor(tableName) {
    return this._ensuredIndexes.has(tableName);
  }

  normalizeOptions(options = {}) {
    const { returnFull = false, strict = true } = options;
    return { returnFull, strict };
  }

  // ---------------------------------------------------------------------------
  // CRUD stubs
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    this.notImplemented("findById");
  }

  async findMany(table, whereClause = "") {
    this.notImplemented("findMany");
  }

  async insertOne(table, data, options = {}) {
    this.notImplemented("insertOne");
  }

  async insertMany(table, data = [], options = {}) {
    this.notImplemented("insertMany");
  }

  async updateOne(table, data, options = {}) {
    this.notImplemented("updateOne");
  }

  async updateMany(table, data, whereClause = "") {
    this.notImplemented("updateMany");
  }

  async upsert(table, data, options = {}) {
    this.notImplemented("upsert");
  }

  async upsertMany(table, data = [], options = {}) {
    this.notImplemented("upsertMany");
  }

  async deleteOne(table, whereClause = "") {
    this.notImplemented("deleteOne");
  }

  async deleteMany(table, whereClause = "") {
    this.notImplemented("deleteMany");
  }

  async count(table, whereClause = "") {
    this.notImplemented("count");
  }

  async exists(table, whereClause = "") {
    this.notImplemented("exists");
  }

  async aggregate(table, pipeline) {
    this.notImplemented("aggregate");
  }

  async query(rawQuery, options) {
    this.notImplemented("query");
  }

  async transaction(callback) {
    this.notImplemented("transaction");
  }

  async startTransaction() {
    this.notImplemented("startTransaction");
  }

  async commitTransaction(session) {
    this.notImplemented("commitTransaction");
  }

  async rollbackTransaction(session) {
    this.notImplemented("rollbackTransaction");
  }
}
