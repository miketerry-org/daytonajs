// schema.js:

/**
 * Schema
 *
 * A lightweight, database-agnostic schema definition system for domain models.
 * Supports relational and document database targets through adapters.
 * Provides validation, indexing, and type-safe field declarations.
 */
export default class Schema {
  constructor() {
    this.definition = {
      fields: {},
      indexes: [],
      primaryField: null,
    };
  }

  // -------------------------------------------------------------------------
  // Core Schema Definition
  // -------------------------------------------------------------------------

  /**
   * Add a field to the schema.
   * @param {string} name - The field name.
   * @param {string} type - The field type (string, number, boolean, etc.).
   * @param {object} [options={}] - Additional field metadata and constraints.
   * @returns {Schema} This instance (chainable).
   */
  addField(name, type, options = {}) {
    this.definition.fields[name] = { type, ...options };
    return this;
  }

  /**
   * Define a primary key field (database agnostic).
   * This is the logical unique identifier (e.g., "id").
   * Each database driver will map this to its preferred column/field type.
   *
   * @param {string} name - Logical primary key name (default: "id").
   * @param {string} [type="string"] - Data type of the field.
   * @param {object} [options={}] - Additional field options.
   */
  addPrimary(name = "id", type = "string", options = {}) {
    // Record this field
    this.addField(name, type, { primary: true, required: true, ...options });
    this.definition.primaryField = name;

    // Create a unique index on it
    this.addIndex(name, { unique: true, primary: true });

    return this;
  }

  // -------------------------------------------------------------------------
  // Type Helpers
  // -------------------------------------------------------------------------

  addBoolean(name, required = false, defaultValue) {
    return this.addField(name, "boolean", { required, defaultValue });
  }

  addDate(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "date", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  addEmail(name, required = false, defaultValue) {
    return this.addField(name, "email", { required, defaultValue });
  }

  addEnum(name, required = false, values = [], defaultValue) {
    return this.addField(name, "enum", { required, values, defaultValue });
  }

  addInteger(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "integer", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  addNumber(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "number", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  addPassword(name, required = false, options = {}) {
    return this.addField(name, "password", { required, ...options });
  }

  addString(name, required = false, minLength, maxLength, defaultValue) {
    return this.addField(name, "string", {
      required,
      minLength,
      maxLength,
      defaultValue,
    });
  }

  addTime(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "time", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  addTimestamp(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "timestamp", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  addTimestamps() {
    this.addTimestamp("createdAt", true);
    this.addTimestamp("updatedAt", true);
    return this;
  }

  addCustom(name, type, options = {}, handler = null) {
    return this.addField(name, type, { ...options, handler });
  }

  // -------------------------------------------------------------------------
  // Indexing
  // -------------------------------------------------------------------------

  /**
   * Add an index definition to the schema.
   * @param {string | Array<{ name: string, order?: "asc" | "desc" }>} fields
   * @param {object} [options={}]
   */
  addIndex(fields, options = {}) {
    if (!Array.isArray(fields)) {
      fields = [{ name: fields, order: "asc" }];
    } else {
      fields = fields.map(f =>
        typeof f === "string"
          ? { name: f, order: "asc" }
          : { order: "asc", ...f }
      );
    }
    this.definition.indexes.push({ fields, ...options });
    return this;
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  validate(data) {
    const errors = [];
    const validated = {};

    for (const [name, rules] of Object.entries(this.definition.fields)) {
      const value = data[name];

      // Required field check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${name} is required`);
        continue;
      }

      // Default handling
      const finalValue =
        value !== undefined && value !== null
          ? value
          : rules.defaultValue !== undefined
          ? rules.defaultValue
          : undefined;

      if (finalValue === undefined) continue;

      // Type validation
      if (!this.#validateType(finalValue, rules.type)) {
        errors.push(`${name} must be of type ${rules.type}`);
        continue;
      }

      // Length constraints
      if (rules.minLength && finalValue.length < rules.minLength)
        errors.push(`${name} must be at least ${rules.minLength} characters`);
      if (rules.maxLength && finalValue.length > rules.maxLength)
        errors.push(`${name} must be at most ${rules.maxLength} characters`);

      // Numeric constraints
      if (rules.minValue !== undefined && finalValue < rules.minValue)
        errors.push(`${name} must be >= ${rules.minValue}`);
      if (rules.maxValue !== undefined && finalValue > rules.maxValue)
        errors.push(`${name} must be <= ${rules.maxValue}`);

      // Enum constraint
      if (rules.type === "enum" && !rules.values.includes(finalValue))
        errors.push(`${name} must be one of: ${rules.values.join(", ")}`);

      // Custom handler
      if (typeof rules.handler === "function") {
        const result = rules.handler(finalValue, data);
        if (result !== true)
          errors.push(
            typeof result === "string"
              ? result
              : `${name} failed custom validation`
          );
      }

      validated[name] = finalValue;
    }

    return {
      valid: errors.length === 0,
      errors,
      value: validated,
    };
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  getSchema() {
    return this.definition;
  }

  getPrimaryField() {
    return this.definition.primaryField;
  }

  // -------------------------------------------------------------------------
  // Internal Helpers
  // -------------------------------------------------------------------------

  #validateType(value, type) {
    switch (type) {
      case "string":
      case "email":
      case "password":
      case "enum":
        return typeof value === "string";
      case "boolean":
        return typeof value === "boolean";
      case "integer":
        return Number.isInteger(value);
      case "number":
        return typeof value === "number";
      case "date":
      case "time":
      case "timestamp":
        return value instanceof Date || !isNaN(Date.parse(value));
      default:
        return true;
    }
  }
}
