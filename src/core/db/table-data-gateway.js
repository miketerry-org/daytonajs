// -----------------------------------------------------------------------------
// table-data-gateway.js
// -----------------------------------------------------------------------------
import BaseModel from "./base-model.js";
import { ValidationError } from "./base-model.js";

export default class TableDataGateway extends BaseModel {
  async find(id) {
    return this.driver.findById(this.tableName, id);
  }

  async findAll(criteria = {}) {
    return this.driver.findMany(this.tableName, criteria);
  }

  async insert(data) {
    const results = this._schema.validate(data);
    if (!results.valid) {
      this._logValidationErrors("insert", results.errors);
      throw new ValidationError(this.name, "insert", results.errors);
    }
    return this.driver.insertOne(this.tableName, results.value);
  }

  async update(data) {
    return this._handleValidationAndExecute(
      "update",
      data,
      async validated => this.driver.updateOne(this.tableName, validated),
      { partial: true }
    );
  }

  async upsert(data) {
    return this._handleValidationAndExecute("upsert", data, async validated =>
      this.driver.upsert(this.tableName, validated)
    );
  }

  async delete(idOrCriteria) {
    const criteria =
      typeof idOrCriteria === "object" ? idOrCriteria : { id: idOrCriteria };
    return this.driver.deleteOne(this.tableName, criteria);
  }

  // Batch operations
  insertMany(records) {
    return this.driver.insertMany(this.tableName, records);
  }
  updateMany(records) {
    return this.driver.updateMany(this.tableName, records);
  }
  upsertMany(records) {
    return this.driver.upsertMany(this.tableName, records);
  }
  deleteMany(criteria) {
    return this.driver.deleteMany(this.tableName, criteria);
  }

  // Aggregate and query
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
}
