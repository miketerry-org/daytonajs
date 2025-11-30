// sql-driver.js:

import AbstractDriver from "./abstract-driver.js";

export default class SQLDriver extends AbstractDriver {
  constructor(dbClient) {
    super();
    this.db = dbClient; // expects a knex-like SQL client
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  async findById(table, id) {
    return (await this.db(table).where("id", id).first()) || null;
  }

  async findMany(table, whereClause = {}) {
    return await this.db(table).where(whereClause);
  }

  async insertOne(table, data, options = {}) {
    const { returnFull = false } = this.normalizeOptions(options);
    const result = await this.db(table).insert(data).returning("*");
    return returnFull ? result[0] : { id: result[0].id };
  }

  async insertMany(table, data = [], options = {}) {
    const { returnFull = false } = this.normalizeOptions(options);
    const result = await this.db(table).insert(data).returning("*");
    return returnFull ? result : result.map(r => ({ id: r.id }));
  }

  async updateOne(table, data, options = {}) {
    const { returnFull = false } = this.normalizeOptions(options);
    const { id, ...updateData } = data;
    const result = await this.db(table)
      .where("id", id)
      .update(updateData)
      .returning("*");
    return returnFull ? result[0] : { id };
  }

  async updateMany(table, data, whereClause = {}, options = {}) {
    const result = await this.db(table).where(whereClause).update(data);
    return { affectedRows: result };
  }

  async upsert(table, data, options = {}) {
    const { returnFull = false } = this.normalizeOptions(options);
    const result = await this.db(table)
      .insert(data)
      .onConflict("id")
      .merge()
      .returning("*");
    return returnFull ? result[0] : { id: result[0].id };
  }

  async upsertMany(table, data = [], options = {}) {
    const { returnFull = false } = this.normalizeOptions(options);
    const result = await this.db(table)
      .insert(data)
      .onConflict("id")
      .merge()
      .returning("*");
    return returnFull ? result : result.map(r => ({ id: r.id }));
  }

  async deleteOne(table, whereClause = {}) {
    const result = await this.db(table).where(whereClause).del();
    return { deletedCount: result };
  }

  async deleteMany(table, whereClause = {}) {
    const result = await this.db(table).where(whereClause).del();
    return { deletedCount: result };
  }

  // ---------------------------------------------------------------------------
  // Utility operations
  // ---------------------------------------------------------------------------

  async count(table, whereClause = {}) {
    const [{ count }] = await this.db(table)
      .where(whereClause)
      .count("* as count");
    return parseInt(count, 10);
  }

  async exists(table, whereClause = {}) {
    return (await this.count(table, whereClause)) > 0;
  }

  async aggregate(table, pipeline = []) {
    throw new Error(
      "SQLDriver.aggregate() is not implemented (not applicable to SQL)."
    );
  }

  async query(rawQuery, options = {}) {
    const { bindings = [] } = options;
    return this.db.raw(rawQuery, bindings);
  }

  // ---------------------------------------------------------------------------
  // Transaction management
  // ---------------------------------------------------------------------------

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
