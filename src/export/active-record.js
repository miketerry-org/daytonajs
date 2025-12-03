// active-record.js:

import AbstractModel, { ValidationError } from "../database/abstract-model.js";

export default class ActiveRecord extends AbstractModel {
  constructor(driver, tableName, schema) {
    super(driver, tableName, schema);
  }

  // ------------------------------------------------------------
  // RECORD HELPERS
  // ------------------------------------------------------------
  async save(options = {}) {
    if (!this._data.id) {
      return this.insertOne(this._data, options).then(result => {
        this._setData(result);
        return this;
      });
    }

    return this.updateOne(this._data, options).then(result => {
      this._setData(result);
      return this;
    });
  }

  async delete(options = {}) {
    if (!this._data.id) {
      throw new Error("Cannot delete record without an ID.");
    }

    return this._driver.deleteOne(
      this._tableName,
      { id: this._data.id },
      options
    );
  }

  // ------------------------------------------------------------
  // CRUD OPERATIONS (correct driver API)
  // ------------------------------------------------------------
  async insertOne(record, options = {}) {
    return this._handleValidationAndExecute("insertOne", record, valid =>
      this._driver.insertOne(this._tableName, valid, options)
    );
  }

  async insertMany(records = [], options = {}) {
    const validated = [];
    for (const r of records) {
      const res = this._schema.validate(this._tableName, r, options);
      if (!res.valid)
        throw new ValidationError(this.name, "insertMany", res.errors);
      validated.push(res.value);
    }
    return this._driver.insertMany(this._tableName, validated, options);
  }

  async updateOne(record, options = {}) {
    if (!record?.id) throw new Error("updateOne requires data with an ID.");

    return this._handleValidationAndExecute("updateOne", record, valid =>
      this._driver.updateOne(this._tableName, valid, options)
    );
  }

  async updateMany(where, record, options = {}) {
    return this._handleValidationAndExecute("updateMany", record, valid =>
      this._driver.updateMany(this._tableName, valid, where)
    );
  }

  async upsert(record, options = {}) {
    return this._handleValidationAndExecute("upsert", record, valid =>
      this._driver.upsert(this._tableName, valid, options)
    );
  }

  async upsertMany(records = [], options = {}) {
    const validated = [];
    for (const r of records) {
      const res = this._schema.validate(this._tableName, r, options);
      if (!res.valid)
        throw new ValidationError(this.name, "upsertMany", res.errors);
      validated.push(res.value);
    }
    return this._driver.upsertMany(this._tableName, validated, options);
  }

  async deleteOne(idOrWhere, options = {}) {
    const where = typeof idOrWhere === "object" ? idOrWhere : { id: idOrWhere };
    return this._driver.deleteOne(this._tableName, where, options);
  }

  async deleteMany(where, options = {}) {
    return this._driver.deleteMany(this._tableName, where, options);
  }

  async findById(id, options = {}) {
    return this._driver.findById(this._tableName, id, options);
  }

  async findMany(where = {}, options = {}) {
    return this._driver.findMany(this._tableName, where, options);
  }

  async count(where = {}, options = {}) {
    return this._driver.count(this._tableName, where, options);
  }

  async exists(where = {}, options = {}) {
    return this._driver.exists(this._tableName, where, options);
  }

  async aggregate(pipeline = [], options = {}) {
    return this._driver.aggregate(this._tableName, pipeline, options);
  }

  async query(rawQuery, options = {}) {
    return this._driver.query(rawQuery, options);
  }

  // ------------------------------------------------------------
  // TRANSACTIONS
  // ------------------------------------------------------------
  async transaction(callback) {
    return this._driver.transaction(callback);
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
