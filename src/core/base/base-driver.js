// -----------------------------------------------------------------------------
// base-driver.js
// -----------------------------------------------------------------------------

export default class BaseDriver {
  constructor(config = {}) {
    this._config = config;
  }

  // ---------------------------------------------------------------------------
  // Connection
  // ---------------------------------------------------------------------------
  async connect() {
    throw new Error("connect() not implemented in BaseDriver");
  }

  async disconnect() {
    throw new Error("disconnect() not implemented in BaseDriver");
  }

  // ---------------------------------------------------------------------------
  // Collection / Table access
  // ---------------------------------------------------------------------------
  collection(name) {
    throw new Error("collection() not implemented in BaseDriver");
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------
  async findById(table, id) {
    throw new Error("findById() not implemented in BaseDriver");
  }

  async findMany(table, criteria = {}) {
    throw new Error("findMany() not implemented in BaseDriver");
  }

  async insertOne(table, document) {
    throw new Error("insertOne() not implemented in BaseDriver");
  }

  async insertMany(table, documents) {
    throw new Error("insertMany() not implemented in BaseDriver");
  }

  async updateOne(table, document) {
    throw new Error("updateOne() not implemented in BaseDriver");
  }

  async updateMany(table, documents) {
    throw new Error("updateMany() not implemented in BaseDriver");
  }

  async upsert(table, document) {
    throw new Error("upsert() not implemented in BaseDriver");
  }

  async upsertMany(table, documents) {
    throw new Error("upsertMany() not implemented in BaseDriver");
  }

  async deleteOne(table, criteria) {
    throw new Error("deleteOne() not implemented in BaseDriver");
  }

  async deleteMany(table, criteria) {
    throw new Error("deleteMany() not implemented in BaseDriver");
  }

  async count(table, criteria = {}) {
    throw new Error("count() not implemented in BaseDriver");
  }

  async exists(table, criteria = {}) {
    throw new Error("exists() not implemented in BaseDriver");
  }

  async aggregate(table, pipeline = []) {
    throw new Error("aggregate() not implemented in BaseDriver");
  }

  async query(rawQuery, options = {}) {
    throw new Error("query() not implemented in BaseDriver");
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  async startTransaction() {
    throw new Error("startTransaction() not implemented in BaseDriver");
  }

  async commitTransaction(session) {
    throw new Error("commitTransaction() not implemented in BaseDriver");
  }

  async rollbackTransaction(session) {
    throw new Error("rollbackTransaction() not implemented in BaseDriver");
  }

  async transaction(callback) {
    throw new Error("transaction() not implemented in BaseDriver");
  }
}
