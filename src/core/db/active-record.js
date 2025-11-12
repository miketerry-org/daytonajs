// -----------------------------------------------------------------------------
// active-record.js
// -----------------------------------------------------------------------------
import BaseModel, { ValidationError } from "./base-model.js";

export default class ActiveRecord extends BaseModel {
  // ---------------------------------------------------------------------------
  // CRUD – instance level (domain + persistence)
  // ---------------------------------------------------------------------------
  async findById(id, { mutate = false } = {}) {
    const record = await this.driver.findById(this.tableName, id);
    if (!record) return null;

    if (mutate) {
      this._setData(record);
      return this;
    }

    const instance = new this.constructor(this.driver);
    instance._setData(record);
    return instance;
  }

  async findMany(criteria = {}, { asInstances = true } = {}) {
    const results = await this.driver.findMany(this.tableName, criteria);
    if (!asInstances) return results;

    return results.map(record => {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      return instance;
    });
  }

  async insert() {
    const results = this._schema.validate(this._data);
    if (!results.valid) {
      this._logValidationErrors("insert", results.errors);
      throw new ValidationError(this.name, "insert", results.errors);
    }
    const inserted = await this.driver.insertOne(this.tableName, results.value);
    this._setData({ ...results.value, ...inserted });
    return this.toObject();
  }

  async update() {
    return this._handleValidationAndExecute(
      "update",
      this._data,
      async validated => {
        const result = await this.driver.updateOne(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      },
      { partial: true }
    );
  }

  async upsert() {
    return this._handleValidationAndExecute(
      "upsert",
      this._data,
      async validated => {
        const result = await this.driver.upsert(this.tableName, validated);
        this._setData({ ...validated, ...result });
        return this.toObject();
      }
    );
  }

  async delete() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    const id = this._data[pk];
    if (!id) throw new Error(`${this.name}.delete() requires a primary key`);
    const result = await this.driver.deleteOne(this.tableName, { [pk]: id });
    return { ...this.toObject(), deleted: true, result };
  }

  async save() {
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    return this._data[pk] ? this.update() : this.insert();
  }

  // ---------------------------------------------------------------------------
  // Batch operations (reuse instance CRUD)
  // ---------------------------------------------------------------------------
  async insertMany(records) {
    if (!Array.isArray(records) || !records.length) return [];
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.insert());
    }
    return results;
  }

  async updateMany(records) {
    if (!Array.isArray(records) || !records.length) return [];
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.update());
    }
    return results;
  }

  async upsertMany(records) {
    if (!Array.isArray(records) || !records.length) return [];
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      results.push(await instance.upsert());
    }
    return results;
  }

  async deleteMany(records) {
    if (!Array.isArray(records) || !records.length) return [];
    const pk = this._schema.getPrimaryKeyField?.() ?? "id";
    const results = [];
    for (const record of records) {
      const instance = new this.constructor(this.driver);
      instance._setData(record);
      if (!instance._data[pk]) {
        throw new Error(
          `${this.name}.deleteMany() requires each record to have primary key '${pk}'`
        );
      }
      results.push(await instance.delete());
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Aggregates and queries
  // ---------------------------------------------------------------------------
  count(criteria) {
    return this.driver.count(this.tableName, criteria);
  }
  exists(criteria) {
    return this.driver.exists(this.tableName, criteria);
  }
  aggregate(pipeline) {
    return this.driver.aggregate(this.tableName, pipeline);
  }
  query(rawQuery, options = {}) {
    return this.driver.query(rawQuery, options);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  startTransaction() {
    return this.driver.startTransaction();
  }
  commitTransaction(session) {
    return this.driver.commitTransaction(session);
  }
  rollbackTransaction(session) {
    return this.driver.rollbackTransaction(session);
  }
  transaction(callback) {
    return this.driver.transaction(callback);
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------
  static async insertOne(driver, data) {
    const instance = new this(driver);
    instance._setData(data);
    return instance.insert();
  }
}
