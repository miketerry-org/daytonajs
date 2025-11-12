// base-driver.js

export default class BaseDriver {
  constructor() {
    // Tracks which tables have had indexes ensured
    this._ensuredIndexes = new Set();
  }

  // ---------------------------------------------------------------------------
  // Index management
  // ---------------------------------------------------------------------------

  ensureIndexes(tableName, schema) {
    if (this._ensuredIndexes.has(tableName)) return;

    const indexes = schema.getIndexes?.();
    if (!indexes || !indexes.length) return;

    // Example pseudo-implementation (override for real DB)
    console.log(`✅ Ensuring indexes for table "${tableName}":`, indexes);

    this._ensuredIndexes.add(tableName);
  }

  hasEnsuredIndexesFor(tableName) {
    return this._ensuredIndexes.has(tableName);
  }

  // ---------------------------------------------------------------------------
  // Required database operations (to be implemented by subclasses)
  // ---------------------------------------------------------------------------

  async findById(table, id) {
    this.requireOverride("findById");
  }

  async findMany(table, whereClause = "") {
    this.requireOverride("findMany");
  }

  async insertOne(table, schema, data, options = {}) {
    this.requireOverride("insertOne");
  }

  async insertMany(table, schema, data = [], options = {}) {
    this.requireOverride("insertMany");
  }

  async updateOne(table, schema, data, options = {}) {
    this.requireOverride("updateOne");
  }

  async updateMany(table, schema, data, whereClause = "") {
    this.requireOverride("updateMany");
  }

  async upsert(table, schema, data, options = {}) {
    this.requireOverride("upsert");
  }

  async upsertMany(table, schema, data = [], options = {}) {
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

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  requireOverride(methodName) {
    throw new Error(
      `❌ BaseDriver.${methodName}() must be implemented by a subclass.`
    );
  }

  /**
   * Normalize options object for insert/update/upsert
   * @param {object} options
   * @returns {{returnFull: boolean, strict: boolean}}
   */
  normalizeOptions(options = {}) {
    const { returnFull = false, strict = true } = options;
    return { returnFull, strict };
  }

  /**
   * Validate data against a schema.
   * Delegates to schema.validate() and includes table context.
   *
   * @param {string} table - Table name
   * @param {Schema} schema - Schema instance
   * @param {object} data - Data to validate
   * @param {object} options - Validation options
   * @returns {{table: string, valid: boolean, errors: string[], value: object}}
   */
  validate(table, schema, data, options = {}) {
    return schema.validate(table, data, options);
  }
}
