// -----------------------------------------------------------------------------
// active-record.js
// -----------------------------------------------------------------------------

import BaseModel, { ValidationError } from "../base/base-model.js";

export default class ActiveRecord extends BaseModel {
  constructor(driver, tableName, schema, config = {}, initialData = {}) {
    super(driver, tableName, schema, config);
    this._setData(initialData); // Initialize record-level data
  }

  // ---------------------------------------------------------------------------
  // Record-level helpers
  // ---------------------------------------------------------------------------
  async save(options = {}) {
    if (!this._data.id) {
      return this.insertOne(this._data, options).then(result => {
        this._setData(result);
        return this;
      });
    } else {
      return this.updateOne(this._data.id, this._data, options).then(result => {
        this._setData(result);
        return this;
      });
    }
  }

  async delete(options = {}) {
    if (!this._data.id) {
      throw new Error("Cannot delete record without an ID.");
    }
    return this.deleteOne(this._data.id, options);
  }

  // ---------------------------------------------------------------------------
  // Single-record operations
  // ---------------------------------------------------------------------------
  async insertOne(record = this._data, options = {}) {
    return this._handleValidationAndExecute("insertOne", record, validData =>
      this._driver.insertOne(this._tableName, validData, options)
    );
  }

  async updateOne(id = this._data.id, record = this._data, options = {}) {
    if (!id) throw new Error("updateOne requires a record ID.");
    return this._handleValidationAndExecute("updateOne", record, validData =>
      this._driver.updateOne(this._tableName, id, validData, options)
    );
  }

  async deleteOne(id = this._data.id, options = {}) {
    if (!id) throw new Error("deleteOne requires a record ID.");
    return this._driver.deleteOne(this._tableName, id, options);
  }

  // ---------------------------------------------------------------------------
  // Table-level operations (delegated)
  // ---------------------------------------------------------------------------
  async findById(id, options = {}) {
    return this._driver.findById(this._tableName, id, options);
  }

  async findMany(filters = {}, options = {}) {
    return this._driver.findMany(this._tableName, filters, options);
  }

  async insertMany(records = [], options = {}) {
    return Promise.all(
      records.map(record =>
        this._handleValidationAndExecute("insertMany", record, validData =>
          this._driver.insertOne(this._tableName, validData, options)
        )
      )
    );
  }

  async upsert(record, options = {}) {
    return this._handleValidationAndExecute("upsert", record, validData =>
      this._driver.upsert(this._tableName, validData, options)
    );
  }

  async upsertMany(records = [], options = {}) {
    return Promise.all(
      records.map(record =>
        this._handleValidationAndExecute("upsertMany", record, validData =>
          this._driver.upsert(this._tableName, validData, options)
        )
      )
    );
  }

  async updateMany(filters, record, options = {}) {
    return this._handleValidationAndExecute("updateMany", record, validData =>
      this._driver.updateMany(this._tableName, filters, validData, options)
    );
  }

  async deleteMany(filters, options = {}) {
    return this._driver.deleteMany(this._tableName, filters, options);
  }

  async count(filters = {}, options = {}) {
    return this._driver.count(this._tableName, filters, options);
  }

  async exists(filters = {}, options = {}) {
    return this._driver.exists(this._tableName, filters, options);
  }

  async aggregate(pipeline = [], options = {}) {
    return this._driver.aggregate(this._tableName, pipeline, options);
  }

  async query(queryString, params = [], options = {}) {
    return this._driver.query(this._tableName, queryString, params, options);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  async transaction(actions = []) {
    return this._driver.transaction(this._tableName, actions);
  }

  async startTransaction() {
    return this._driver.startTransaction();
  }

  async commitTransaction() {
    return this._driver.commitTransaction();
  }

  async rollbackTransaction() {
    return this._driver.rollbackTransaction();
  }
}
