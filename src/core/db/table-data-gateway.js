// -----------------------------------------------------------------------------
// table-data-gateway.js
// -----------------------------------------------------------------------------

import BaseModel, { ValidationError } from "../base/base-model.js";

export default class TableDataGateway extends BaseModel {
  constructor(driver, tableName, schema, config = {}) {
    super(driver, tableName, schema, config);
    // No need to redefine _driver/_tableName/_schema here because BaseModel already does it
  }

  // ---------------------------------------------------------------------------
  // Query methods
  // ---------------------------------------------------------------------------
  async findById(id, options = {}) {
    return this._driver.findById(this._tableName, id, options);
  }

  async findMany(filters = {}, options = {}) {
    return this._driver.findMany(this._tableName, filters, options);
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
  // Insert / Upsert
  // ---------------------------------------------------------------------------
  async insertOne(record, options = {}) {
    return super._handleValidationAndExecute(
      "insertOne",
      record,
      validData => this._driver.insertOne(this._tableName, validData, options),
      options
    );
  }

  async insertMany(records = [], options = {}) {
    return Promise.all(
      records.map(record =>
        super._handleValidationAndExecute(
          "insertMany",
          record,
          validData =>
            this._driver.insertOne(this._tableName, validData, options),
          options
        )
      )
    );
  }

  async upsert(record, options = {}) {
    return super._handleValidationAndExecute(
      "upsert",
      record,
      validData => this._driver.upsert(this._tableName, validData, options),
      options
    );
  }

  async upsertMany(records = [], options = {}) {
    return Promise.all(
      records.map(record =>
        super._handleValidationAndExecute(
          "upsertMany",
          record,
          validData => this._driver.upsert(this._tableName, validData, options),
          options
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  async updateOne(id, record, options = {}) {
    return super._handleValidationAndExecute(
      "updateOne",
      record,
      validData =>
        this._driver.updateOne(this._tableName, id, validData, options),
      options
    );
  }

  async updateMany(filters, record, options = {}) {
    return super._handleValidationAndExecute(
      "updateMany",
      record,
      validData =>
        this._driver.updateMany(this._tableName, filters, validData, options),
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async deleteOne(id, options = {}) {
    return this._driver.deleteOne(this._tableName, id, options);
  }

  async deleteMany(filters, options = {}) {
    return this._driver.deleteMany(this._tableName, filters, options);
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
