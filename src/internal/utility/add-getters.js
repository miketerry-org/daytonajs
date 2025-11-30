// add-getters.js

export default function addGetters(data) {
  if (!data || typeof data !== "object") {
    throw new Error(`"AddGetters" must be passed an object.`);
  }

  //
  // ---------------------------------------------------------
  // Shared Value + Length Validation Helper
  // ---------------------------------------------------------
  //
  function validateValue({
    name,
    value,
    defaultValue,
    typeCheck,
    minLength,
    maxLength,
  }) {
    const getLength = v =>
      v != null && typeof v.length === "number" ? v.length : 0;

    const validate = val => {
      if (!typeCheck(val)) {
        throw new Error(`"${name}" has invalid type.`);
      }

      // length constraints only apply if provided
      if (minLength != null) {
        const len = getLength(val);
        if (len < minLength) {
          throw new Error(
            `"${name}" must be at least ${minLength} long (found ${len}).`
          );
        }
      }

      if (maxLength != null) {
        const len = getLength(val);
        if (len > maxLength) {
          throw new Error(
            `"${name}" must be no more than ${maxLength} long (found ${len}).`
          );
        }
      }

      return val;
    };

    // Value missing
    if (value == null) {
      if (defaultValue !== undefined) {
        return validate(defaultValue);
      }
      throw new Error(`"${name}" is required.`);
    }

    return validate(value);
  }

  //
  // ---------------------------------------------------------
  // getArray()
  // ---------------------------------------------------------
  //
  data.getArray = (name, defaultValue, minLength, maxLength) => {
    return validateValue({
      name,
      value: data[name],
      defaultValue,
      typeCheck: v => Array.isArray(v),
      minLength,
      maxLength,
    });
  };

  //
  // ---------------------------------------------------------
  // getString()
  // ---------------------------------------------------------
  //
  data.getString = (name, defaultValue, minLength, maxLength) => {
    return validateValue({
      name,
      value: data[name],
      defaultValue,
      typeCheck: v => typeof v === "string",
      minLength,
      maxLength,
    });
  };

  //
  // ---------------------------------------------------------
  // getBoolean()
  // ---------------------------------------------------------
  //
  data.getBoolean = (name, defaultValue) => {
    let value = data[name];

    if (value == null) {
      if (defaultValue !== undefined) {
        if (typeof defaultValue !== "boolean") {
          throw new Error(`"${name}" defaultValue must be a boolean.`);
        }
        return defaultValue;
      }
      throw new Error(`"${name}" is required.`);
    }

    if (typeof value !== "boolean") {
      throw new Error(`"${name}" must be a boolean.`);
    }

    return value;
  };

  //
  // ---------------------------------------------------------
  // getNumber()
  // ---------------------------------------------------------
  //
  data.getNumber = (name, defaultValue, minValue, maxValue) => {
    let value = data[name];

    if (value == null) {
      if (defaultValue !== undefined) {
        if (typeof defaultValue !== "number" || Number.isNaN(defaultValue)) {
          throw new Error(`"${name}" defaultValue must be a number.`);
        }
        value = defaultValue;
      } else {
        throw new Error(`"${name}" is required.`);
      }
    }

    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`"${name}" must be a number.`);
    }

    if (minValue != null && value < minValue) {
      throw new Error(`"${name}" must be >= ${minValue} (found ${value}).`);
    }

    if (maxValue != null && value > maxValue) {
      throw new Error(`"${name}" must be <= ${maxValue} (found ${value}).`);
    }

    return value;
  };

  //
  // ---------------------------------------------------------
  // getInteger()
  // ---------------------------------------------------------
  //
  data.getInteger = (name, defaultValue, minValue, maxValue) => {
    let value = data[name];

    if (value == null) {
      if (defaultValue !== undefined) {
        if (!Number.isInteger(defaultValue)) {
          throw new Error(`"${name}" defaultValue must be an integer.`);
        }
        value = defaultValue;
      } else {
        throw new Error(`"${name}" is required.`);
      }
    }

    if (!Number.isInteger(value)) {
      throw new Error(`"${name}" must be an integer.`);
    }

    if (minValue != null && value < minValue) {
      throw new Error(`"${name}" must be >= ${minValue} (found ${value}).`);
    }

    if (maxValue != null && value > maxValue) {
      throw new Error(`"${name}" must be <= ${maxValue} (found ${value}).`);
    }

    return value;
  };

  //
  // ---------------------------------------------------------
  // getEnumerated() - ensures value is one of validValues
  // ---------------------------------------------------------
  //
  data.getEnumerated = (name, validValues = [], defaultValue) => {
    const value = data[name];

    if (!Array.isArray(validValues) || validValues.length === 0) {
      throw new Error(
        `"${name}" validValues must be a non-empty array of allowed values.`
      );
    }

    const check = v => {
      if (!validValues.includes(v)) {
        throw new Error(
          `"${name}" must be one of [${validValues.join(", ")}] (found ${v}).`
        );
      }
      return v;
    };

    if (value == null) {
      if (defaultValue !== undefined) return check(defaultValue);
      throw new Error(`"${name}" is required.`);
    }

    return check(value);
  };

  //
  // ---------------------------------------------------------
  // getObject()
  // ---------------------------------------------------------
  //
  data.getObject = (name, defaultValue) => {
    const value = data[name];

    if (value == null) {
      if (defaultValue !== undefined) {
        if (typeof defaultValue !== "object" || Array.isArray(defaultValue)) {
          throw new Error(`"${name}" defaultValue must be an object.`);
        }
        return defaultValue;
      }
      throw new Error(`"${name}" is required.`);
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`"${name}" must be an object.`);
    }

    return value;
  };

  //
  // ---------------------------------------------------------
  // getDate() - accepts a Date object or a valid date string
  // ---------------------------------------------------------
  //
  data.getDate = (name, defaultValue) => {
    let value = data[name];

    const parse = v => {
      if (v instanceof Date && !isNaN(v)) return v;

      const d = new Date(v);
      if (isNaN(d)) {
        throw new Error(`"${name}" must be a valid date.`);
      }
      return d;
    };

    if (value == null) {
      if (defaultValue !== undefined) return parse(defaultValue);
      throw new Error(`"${name}" is required.`);
    }

    return parse(value);
  };

  //
  // ---------------------------------------------------------
  // getTime() — expects "HH:MM" (24-hour)
  // ---------------------------------------------------------
  //
  data.getTime = (name, defaultValue) => {
    let value = data[name];

    const validateTime = v => {
      if (typeof v !== "string") {
        throw new Error(`"${name}" must be a time string.`);
      }

      const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
      if (!match) {
        throw new Error(`"${name}" must be in HH:MM (24-hour) format.`);
      }
      return v;
    };

    if (value == null) {
      if (defaultValue !== undefined) return validateTime(defaultValue);
      throw new Error(`"${name}" is required.`);
    }

    return validateTime(value);
  };

  //
  // ---------------------------------------------------------
  // getTimestamp() — expects number or valid date string
  // ---------------------------------------------------------
  //
  data.getTimestamp = (name, defaultValue) => {
    let value = data[name];

    const parseTs = v => {
      if (typeof v === "number" && !isNaN(v)) return v;

      const d = new Date(v);
      const ts = d.getTime();
      if (isNaN(ts)) {
        throw new Error(`"${name}" must be a valid timestamp.`);
      }
      return ts;
    };

    if (value == null) {
      if (defaultValue !== undefined) return parseTs(defaultValue);
      throw new Error(`"${name}" is required.`);
    }

    return parseTs(value);
  };

  return data;
}
