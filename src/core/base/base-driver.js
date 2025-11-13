// base-driver.js

export default class BaseDriver {
  constructor() {
    this._ensuredIndexes = new Set();
  }

  ensureIndexes(tableName, schema) {
    if (this._ensuredIndexes.has(tableName)) return;
    const indexes = schema.getIndexes?.();
    if (!indexes || !indexes.length) return;
    console.log(`✅ Ensuring indexes for table "${tableName}":`, indexes);
    this._ensuredIndexes.add(tableName);
  }

  hasEnsuredIndexesFor(tableName) {
    return this._ensuredIndexes.has(tableName);
  }

  requireOverride(methodName) {
    throw new Error(
      `❌ BaseDriver.${methodName}() must be implemented by a subclass.`
    );
  }

  normalizeOptions(options = {}) {
    const { returnFull = false, strict = true } = options;
    return { returnFull, strict };
  }

  // ---------------------------------------------------------------------------
  // CRUD stubs
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    this.requireOverride("findById");
  }
  async findMany(table, whereClause = "") {
    this.requireOverride("findMany");
  }
  async insertOne(table, data, options = {}) {
    this.requireOverride("insertOne");
  }
  async insertMany(table, data = [], options = {}) {
    this.requireOverride("insertMany");
  }
  async updateOne(table, data, options = {}) {
    this.requireOverride("updateOne");
  }
  async updateMany(table, data, whereClause = "") {
    this.requireOverride("updateMany");
  }
  async upsert(table, data, options = {}) {
    this.requireOverride("upsert");
  }
  async upsertMany(table, data = [], options = {}) {
    this.requireOverride("upsertMany");
  }
  async deleteOne(table, whereClause = "") {
    this.requireOverride("deleteOne");
  }
  async deleteMany(table, whereClause = "") {
    this.requireOverride("deleteMany");
  }
  async count(table, whereClause = "") {
    this.requireOverride("count");
  }
  async exists(table, whereClause = "") {
    this.requireOverride("exists");
  }
  async aggregate(table, pipeline) {
    this.requireOverride("aggregate");
  }
  async query(rawQuery, options) {
    this.requireOverride("query");
  }
  async transaction(callback) {
    this.requireOverride("transaction");
  }
  async startTransaction() {
    this.requireOverride("startTransaction");
  }
  async commitTransaction(session) {
    this.requireOverride("commitTransaction");
  }
  async rollbackTransaction(session) {
    this.requireOverride("rollbackTransaction");
  }
}
