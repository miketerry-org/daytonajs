// verify.js:

import assert from "node:assert";

// -----------------------------------------------------------------------------
// 🧭 Error Message Constants
// -----------------------------------------------------------------------------

// Design by Contract (DBC)
const DBC_ERR_INVALID_DATA_PARAM = `DBC: "data" parameter must be a plain object.`;
const DBC_ERR_NAME_PARAM_REQUIRED = `DBC: "name" parameter must be a non-empty string.`;
const DBC_ERR_TYPE_PARAM_MUST_BE_STRING = `DBC: "type" parameter must be a string.`;
const DBC_ERR_REQUIRED_PARAM_MUST_BE_BOOL = `DBC: "required" parameter must be a boolean for field "%NAME%".`;
const DBC_ERR_MINLEN_NONNEG_INT = `DBC: For field "%NAME%", minLength must be a non-negative integer if provided.`;
const DBC_ERR_MAXLEN_NONNEG_INT = `DBC: For field "%NAME%", maxLength must be a non-negative integer if provided.`;
const DBC_ERR_MINLEN_LESS_EQUAL_MAXLEN = `DBC: For field "%NAME%", minLength (%MIN%) cannot be greater than maxLength (%MAX%).`;
const DBC_ERR_MINVALUE_TYPE = `DBC: For field "%NAME%", minValue must be a number or Date if provided.`;
const DBC_ERR_MAXVALUE_TYPE = `DBC: For field "%NAME%", maxValue must be a number or Date if provided.`;
const DBC_ERR_MINVALUE_LESS_EQUAL_MAX = `DBC: For field "%NAME%", minValue (%MIN%) cannot be greater than maxValue (%MAX%).`;

// Validation
const VAL_ERR_FIELD_REQUIRED_MISSING = `VAL: "%NAME%" is required but missing or null.`;
const VAL_ERR_TYPE_MISMATCH = `VAL: "%NAME%" is type "%ACTUAL%" but should be "%EXPECTED%".`;
const VAL_ERR_LENGTH_CHECK_NOT_APPLICABLE = `VAL: "%NAME%" cannot check length because it's not a string/array.`;
const VAL_ERR_LENGTH_TOO_SHORT = `VAL: "%NAME%" length is %LEN% but minimum is %MIN%.`;
const VAL_ERR_LENGTH_TOO_LONG = `VAL: "%NAME%" length is %LEN% but maximum is %MAX%.`;
const VAL_ERR_RANGE_CHECK_NOT_APPLICABLE = `VAL: "%NAME%" cannot check range because it's not number or Date.`;
const VAL_ERR_RANGE_TOO_SMALL = `VAL: "%NAME%" value is %VAL% but minimum is %MIN%.`;
const VAL_ERR_RANGE_TOO_LARGE = `VAL: "%NAME%" value is %VAL% but maximum is %MAX%.`;
const VAL_ERR_COMPARE_MISMATCH = `VAL: "%NAME%" must be identical to "%COMPARE_TO%".`;
const VAL_ERR_INVALID_EMAIL_FORMAT = `VAL: "%NAME%" is not a valid email address.`;
const VAL_ERR_INVALID_ENUM_VALUE = `VAL: "%NAME%" must be one of [ %VALUES% ] but was "%VALUE%".`;
const VAL_ERR_REGEX_NO_MATCH = `VAL: "%NAME%" does not match required pattern.`;
const VAL_ERR_INVALID_TIME_FORMAT = `VAL: "%NAME%" must be in valid time format (HH:MM).`;
const VAL_ERR_PASSWORD_TOO_WEAK = `VAL: "%NAME%" must be at least 12 characters with upper, lower, digit, and symbol.`;

// -----------------------------------------------------------------------------
// 🔒 Internal Helpers
// -----------------------------------------------------------------------------
function _assertContract(condition, msg) {
  assert.strictEqual(condition, true, msg);
}

function isPlainObject(obj) {
  return !!obj && typeof obj === "object" && !Array.isArray(obj);
}

// Add an error only if one hasn’t already been recorded for this field
function addError(errors, field, message) {
  if (!errors.some(e => e.field === field)) {
    errors.push({ field, message });
  }
}

// Ensure the property exists; set default if provided
function checkExists(errors, data, name, defaultValue) {
  _assertContract(isPlainObject(data), DBC_ERR_INVALID_DATA_PARAM);
  _assertContract(
    typeof name === "string" && name.length > 0,
    DBC_ERR_NAME_PARAM_REQUIRED
  );

  if (!(name in data) || data[name] === undefined) {
    if (defaultValue !== undefined) data[name] = defaultValue;
  }
  return true; // always allow next checks
}

// Required field validation
function checkRequired(errors, data, name, required) {
  _assertContract(
    typeof required === "boolean",
    DBC_ERR_REQUIRED_PARAM_MUST_BE_BOOL.replace("%NAME%", name)
  );
  if (required && (data[name] === undefined || data[name] === null)) {
    addError(
      errors,
      name,
      VAL_ERR_FIELD_REQUIRED_MISSING.replace("%NAME%", name)
    );
    return false;
  }
  return true;
}

// Type checking (string, number, boolean, integer, object, date)
function checkType(errors, data, name, type) {
  _assertContract(typeof type === "string", DBC_ERR_TYPE_PARAM_MUST_BE_STRING);

  const value = data[name];
  if (value === undefined || value === null) return true;

  let ok = true;
  if (type === "integer") {
    ok = typeof value === "number" && Number.isInteger(value);
  } else if (type === "date") {
    ok = value instanceof Date;
  } else {
    ok = typeof value === type;
  }

  if (!ok) {
    const expected = type === "integer" ? "integer" : type;
    const actual = value instanceof Date ? "Date" : typeof value;
    addError(
      errors,
      name,
      VAL_ERR_TYPE_MISMATCH.replace("%NAME%", name)
        .replace("%ACTUAL%", actual)
        .replace("%EXPECTED%", expected)
    );
    return false;
  }

  return true;
}

// Length validation for strings and arrays
function checkLength(errors, data, name, minLength, maxLength) {
  const value = data[name];
  if (value === undefined || value === null) return true;

  _assertContract(
    minLength === undefined ||
      (typeof minLength === "number" && minLength >= 0),
    DBC_ERR_MINLEN_NONNEG_INT.replace("%NAME%", name)
  );
  _assertContract(
    maxLength === undefined ||
      (typeof maxLength === "number" && maxLength >= 0),
    DBC_ERR_MAXLEN_NONNEG_INT.replace("%NAME%", name)
  );
  _assertContract(
    !(
      minLength !== undefined &&
      maxLength !== undefined &&
      minLength > maxLength
    ),
    DBC_ERR_MINLEN_LESS_EQUAL_MAXLEN.replace("%NAME%", name)
      .replace("%MIN%", String(minLength))
      .replace("%MAX%", String(maxLength))
  );

  if (typeof value !== "string" && !Array.isArray(value)) {
    addError(
      errors,
      name,
      VAL_ERR_LENGTH_CHECK_NOT_APPLICABLE.replace("%NAME%", name)
    );
    return false;
  }

  const len = value.length;
  if (minLength !== undefined && len < minLength) {
    addError(
      errors,
      name,
      VAL_ERR_LENGTH_TOO_SHORT.replace("%NAME%", name)
        .replace("%LEN%", len)
        .replace("%MIN%", minLength)
    );
    return false;
  }
  if (maxLength !== undefined && len > maxLength) {
    addError(
      errors,
      name,
      VAL_ERR_LENGTH_TOO_LONG.replace("%NAME%", name)
        .replace("%LEN%", len)
        .replace("%MAX%", maxLength)
    );
    return false;
  }

  return true;
}

// Range validation (numbers, dates)
function checkRange(errors, data, name, minValue, maxValue) {
  const value = data[name];
  if (value === undefined || value === null) return true;

  _assertContract(
    minValue === undefined ||
      typeof minValue === "number" ||
      minValue instanceof Date,
    DBC_ERR_MINVALUE_TYPE.replace("%NAME%", name)
  );
  _assertContract(
    maxValue === undefined ||
      typeof maxValue === "number" ||
      maxValue instanceof Date,
    DBC_ERR_MAXVALUE_TYPE.replace("%NAME%", name)
  );

  if (
    minValue &&
    maxValue &&
    ((minValue instanceof Date &&
      maxValue instanceof Date &&
      minValue > maxValue) ||
      (typeof minValue === "number" &&
        typeof maxValue === "number" &&
        minValue > maxValue))
  ) {
    throw new Error(
      DBC_ERR_MINVALUE_LESS_EQUAL_MAX.replace("%NAME%", name)
        .replace("%MIN%", String(minValue))
        .replace("%MAX%", String(maxValue))
    );
  }

  let numericValue;
  if (value instanceof Date) numericValue = value.getTime();
  else if (typeof value === "number") numericValue = value;
  else {
    addError(
      errors,
      name,
      VAL_ERR_RANGE_CHECK_NOT_APPLICABLE.replace("%NAME%", name)
    );
    return false;
  }

  if (minValue !== undefined) {
    const min = minValue instanceof Date ? minValue.getTime() : minValue;
    if (numericValue < min) {
      addError(
        errors,
        name,
        VAL_ERR_RANGE_TOO_SMALL.replace("%NAME%", name)
          .replace("%VAL%", numericValue)
          .replace("%MIN%", min)
      );
      return false;
    }
  }

  if (maxValue !== undefined) {
    const max = maxValue instanceof Date ? maxValue.getTime() : maxValue;
    if (numericValue > max) {
      addError(
        errors,
        name,
        VAL_ERR_RANGE_TOO_LARGE.replace("%NAME%", name)
          .replace("%VAL%", numericValue)
          .replace("%MAX%", max)
      );
      return false;
    }
  }

  return true;
}

// -----------------------------------------------------------------------------
// 🧮 Main Function
// -----------------------------------------------------------------------------
export default function verify(data) {
  _assertContract(isPlainObject(data), DBC_ERR_INVALID_DATA_PARAM);

  const _errors = [];

  const results = {
    get ok() {
      return _errors.length === 0;
    },

    get errors() {
      return _errors;
    },

    isBoolean(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "boolean");
      return results;
    },

    isCompare(name, compareTo, required) {
      _assertContract(
        typeof compareTo === "string" && compareTo.length > 0,
        DBC_ERR_NAME_PARAM_REQUIRED
      );
      checkRequired(_errors, data, name, required);
      if (data[name] !== data[compareTo]) {
        addError(
          _errors,
          name,
          VAL_ERR_COMPARE_MISMATCH.replace("%NAME%", name).replace(
            "%COMPARE_TO%",
            compareTo
          )
        );
      }
      return results;
    },

    isDate(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "date");
      checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isEmail(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "string");

      const value = data[name];
      if (value && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value))
          addError(
            _errors,
            name,
            VAL_ERR_INVALID_EMAIL_FORMAT.replace("%NAME%", name)
          );
      }
      return results;
    },

    isEnum(name, required, values, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      if (data[name] !== undefined && !values.includes(data[name])) {
        addError(
          _errors,
          name,
          VAL_ERR_INVALID_ENUM_VALUE.replace("%NAME%", name)
            .replace("%VALUE%", data[name])
            .replace("%VALUES%", values.join(", "))
        );
      }
      return results;
    },

    isInteger(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "integer");
      checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isNumber(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "number");
      checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isObject(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "object");
      return results;
    },

    isPassword(name, required) {
      checkExists(_errors, data, name);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "string");

      const value = data[name];
      if (typeof value === "string") {
        const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
        if (!strong.test(value))
          addError(
            _errors,
            name,
            VAL_ERR_PASSWORD_TOO_WEAK.replace("%NAME%", name)
          );
      }
      return results;
    },

    isMatch(name, required, regEx, defaultValue) {
      _assertContract(regEx instanceof RegExp, `DBC: regEx must be a RegExp`);
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "string");

      const value = data[name];
      if (value && !regEx.test(value))
        addError(_errors, name, VAL_ERR_REGEX_NO_MATCH.replace("%NAME%", name));
      return results;
    },

    isString(name, required, minLength, maxLength, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "string");
      checkLength(_errors, data, name, minLength, maxLength);
      return results;
    },

    isTime(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "string");

      const value = data[name];
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (value && !timeRegex.test(value))
        addError(
          _errors,
          name,
          VAL_ERR_INVALID_TIME_FORMAT.replace("%NAME%", name)
        );
      return results;
    },

    isTimestamp(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue);
      checkRequired(_errors, data, name, required);
      checkType(_errors, data, name, "date");
      checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },
  };

  return results;
}
