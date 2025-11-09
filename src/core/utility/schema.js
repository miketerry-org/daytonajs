/**
 * Schema
 *
 * A lightweight, database-agnostic schema definition system for domain models.
 * Supports validation, indexing, and typed field declarations.
 */
export default class Schema {
  constructor() {
    this.definition = {
      fields: {}, // Field name → config
      indexes: [], // Index definitions
      primaryField: null, // Primary key field name
    };
  }

  // ---------------------------------------------------------------------------
  // Core Schema Definition
  // ---------------------------------------------------------------------------

  addField(name, type, options = {}) {
    this.definition.fields[name] = { type, ...options };
    return this;
  }

  addPrimary(name = "id", type = "string", options = {}) {
    this.addField(name, type, { primary: true, required: true, ...options });
    this.definition.primaryField = name;
    this.addIndex(name, { unique: true, primary: true });
    return this;
  }

  // ---------------------------------------------------------------------------
  // Typed Helpers
  // ---------------------------------------------------------------------------
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
    this.addTimestamp("createdAt", false);
    this.addTimestamp("updatedAt", false);
    return this;
  }

  addCustom(name, type, options = {}, handler = null) {
    return this.addField(name, type, { ...options, handler });
  }

  // ---------------------------------------------------------------------------
  // Indexing
  // ---------------------------------------------------------------------------
  addIndex(fields, options = {}) {
    const normalized = Array.isArray(fields)
      ? fields.map(f =>
          typeof f === "string"
            ? { name: f, order: "asc" }
            : { order: "asc", ...f }
        )
      : [{ name: fields, order: "asc" }];

    this.definition.indexes.push({ fields: normalized, ...options });
    return this;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  validate(data = {}) {
    const errors = [];
    const validated = {};

    for (const [name, rules] of Object.entries(this.definition.fields)) {
      let value = data[name];

      // Apply default value if not provided
      if (value === undefined && rules.defaultValue !== undefined) {
        value =
          typeof rules.defaultValue === "function"
            ? rules.defaultValue()
            : rules.defaultValue;
      }

      // Required field check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${name} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // Basic normalization
      value = this.#normalizeValue(value, rules.type);

      // Type validation
      if (!this.#validateType(value, rules.type)) {
        errors.push(`${name} must be of type ${rules.type}`);
        continue;
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength)
        errors.push(`${name} must be at least ${rules.minLength} characters`);
      if (rules.maxLength && value.length > rules.maxLength)
        errors.push(`${name} must be at most ${rules.maxLength} characters`);

      // Numeric bounds
      if (rules.minValue !== undefined && value < rules.minValue)
        errors.push(`${name} must be >= ${rules.minValue}`);
      if (rules.maxValue !== undefined && value > rules.maxValue)
        errors.push(`${name} must be <= ${rules.maxValue}`);

      // Enum constraint
      if (rules.type === "enum" && !rules.values.includes(value))
        errors.push(`${name} must be one of: ${rules.values.join(", ")}`);

      // Custom validation
      if (typeof rules.handler === "function") {
        const result = rules.handler(value, data);
        if (result !== true)
          errors.push(
            typeof result === "string"
              ? result
              : `${name} failed custom validation`
          );
      }

      validated[name] = value;
    }

    return {
      valid: errors.length === 0,
      errors,
      value: validated,
    };
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /**
   * Return only field definitions (used by BaseModel).
   */
  getSchema() {
    return this.definition.fields;
  }

  /**
   * Return the full schema definition.
   */
  getDefinition() {
    return this.definition;
  }

  /**
   * Return the name of the primary key field.
   */
  getPrimaryKeyField() {
    return this.definition.primaryField;
  }

  /**
   * Return normalized index definitions for driver consumption.
   * Each entry:
   *  { fields: {field1: 1, field2: -1}, options: { unique: true/false, primary: true/false } }
   */
  getIndexes() {
    return this.definition.indexes.map(idx => {
      const fields = {};
      idx.fields.forEach(f => {
        fields[f.name] = f.order === "desc" ? -1 : 1;
      });
      const options = { unique: !!idx.unique };
      if (idx.primary) options.primary = true;
      return { fields, options };
    });
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------
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
        return typeof value === "number" && !isNaN(value);
      case "date":
      case "time":
      case "timestamp":
        return value instanceof Date || !isNaN(Date.parse(value));
      default:
        return true;
    }
  }

  #normalizeValue(value, type) {
    switch (type) {
      case "string":
      case "email":
      case "password":
      case "enum":
        return String(value).trim();
      case "integer":
        return parseInt(value, 10);
      case "number":
        return parseFloat(value);
      case "boolean":
        return value === "true" || value === true || value === 1;
      case "date":
      case "timestamp":
        return value instanceof Date ? value : new Date(value);
      default:
        return value;
    }
  }
}
