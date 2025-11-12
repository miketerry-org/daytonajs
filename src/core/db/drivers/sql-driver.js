// sql-driver.js

import BaseDriver from "./base-driver.js";

export default class SQLDriver extends BaseDriver {
  constructor(dbClient) {
    super();
    this.db = dbClient; // expects a SQL client/connection
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  async findById(table, id) {
    const row = await this.db(table).where("id", id).first();
    return row || null;
  }

  async findMany(table, whereClause = {}) {
    const rows = await this.db(table).where(whereClause);
    return rows;
  }

  async insertOne(table, schema, data, options = {}) {
    const {
      valid,
      errors,
      value: validatedData,
    } = this.validate(table, schema, data, options);
    if (!valid && options.strict) throw new Error(errors.join(", "));

    const result = await this.db(table).insert(validatedData).returning("*");
    return options.returnFull ? result[0] : { id: result[0].id };
  }

  async insertMany(table, schema, data = [], options = {}) {
    const validatedRows = [];
    const errors = [];

    for (const row of data) {
      const {
        valid,
        errors: rowErrors,
        value: validatedData,
      } = this.validate(table, schema, row, options);
      if (!valid) {
        errors.push(...rowErrors);
        if (options.strict) continue;
      }
      validatedRows.push(validatedData);
    }

    if (options.strict && errors.length) throw new Error(errors.join(", "));

    const result = await this.db(table).insert(validatedRows).returning("*");
    return options.returnFull ? result : result.map(r => ({ id: r.id }));
  }

  async updateOne(table, schema, data, options = {}) {
    const {
      valid,
      errors,
      value: validatedData,
    } = this.validate(table, schema, data, options);
    if (!valid && options.strict) throw new Error(errors.join(", "));

    if (!validatedData.id)
      throw new Error("Missing primary key 'id' for update");

    const result = await this.db(table)
      .where("id", validatedData.id)
      .update(validatedData)
      .returning("*");
    return options.returnFull ? result[0] : { id: validatedData.id };
  }

  async updateMany(table, schema, data, whereClause = {}) {
    const updates = [];
    for (const row of data) {
      const { valid, value: validatedData } = this.validate(table, schema, row);
      if (!valid) continue;
      updates.push(validatedData);
    }

    const result = await this.db(table).where(whereClause).update(updates);
    return result;
  }

  async upsert(table, schema, data, options = {}) {
    const {
      valid,
      errors,
      value: validatedData,
    } = this.validate(table, schema, data, options);
    if (!valid && options.strict) throw new Error(errors.join(", "));

    const result = await this.db(table)
      .insert(validatedData)
      .onConflict(schema.getPrimaryKeyField())
      .merge()
      .returning("*");

    return options.returnFull ? result[0] : { id: result[0].id };
  }

  async upsertMany(table, schema, data = [], options = {}) {
    const validatedRows = [];
    const errors = [];

    for (const row of data) {
      const {
        valid,
        errors: rowErrors,
        value: validatedData,
      } = this.validate(table, schema, row, options);
      if (!valid) {
        errors.push(...rowErrors);
        if (options.strict) continue;
      }
      validatedRows.push(validatedData);
    }

    if (options.strict && errors.length) throw new Error(errors.join(", "));

    const result = await this.db(table)
      .insert(validatedRows)
      .onConflict(schema.getPrimaryKeyField())
      .merge()
      .returning("*");

    return options.returnFull ? result : result.map(r => ({ id: r.id }));
  }

  // ---------------------------------------------------------------------------
  // Delete operations with strict validation
  // ---------------------------------------------------------------------------

  async deleteOne(table, whereClause = {}, options = { strict: true }) {
    if (
      options.strict &&
      (!whereClause || Object.keys(whereClause).length === 0)
    ) {
      throw new Error(
        "Strict mode enabled: deleteOne requires a non-empty whereClause or id"
      );
    }

    const result = await this.db(table).where(whereClause).del();
    return result;
  }

  async deleteMany(table, whereClause = {}, options = { strict: true }) {
    if (
      options.strict &&
      (!whereClause || Object.keys(whereClause).length === 0)
    ) {
      throw new Error(
        "Strict mode enabled: deleteMany requires a non-empty whereClause"
      );
    }

    const result = await this.db(table).where(whereClause).del();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Other utility operations
  // ---------------------------------------------------------------------------

  async count(table, whereClause = {}) {
    const [{ count }] = await this.db(table)
      .where(whereClause)
      .count("* as count");
    return parseInt(count, 10);
  }

  async exists(table, whereClause = {}) {
    const count = await this.count(table, whereClause);
    return count > 0;
  }

  async aggregate(table, pipeline) {
    throw new Error("SQLDriver.aggregate() not implemented");
  }

  async query(rawQuery, options) {
    return this.db.raw(rawQuery, options?.bindings || []);
  }

  async transaction(callback) {
    return await this.db.transaction(callback);
  }

  async startTransaction() {
    return await this.db.transaction();
  }

  async commitTransaction(trx) {
    await trx.commit();
  }

  async rollbackTransaction(trx) {
    await trx.rollback();
  }
}
