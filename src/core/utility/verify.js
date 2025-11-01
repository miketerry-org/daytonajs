// verify.js
"use strict";

import assert from "node:assert";

// --- Error message constants ---

// DBC (Design By Contract)
const DBC_ERR_INVALID_DATA_PARAM = `DBC: "data" parameter must be an object.`;
const DBC_ERR_NAME_PARAM_REQUIRED = `DBC: The "name" parameter must be a non-empty string.`;
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

// --- Internal helpers ---
function _assertContract(condition, msg) {
  assert.strictEqual(condition, true, msg);
}

function checkExists(errors, data, name, defaultValue) {
  _assertContract(typeof data === "object", DBC_ERR_INVALID_DATA_PARAM);
  _assertContract(
    typeof name === "string" && name.length > 0,
    DBC_ERR_NAME_PARAM_REQUIRED
  );
  if (data[name] === undefined) {
    if (defaultValue !== undefined) {
      data[name] = defaultValue;
    }
    return false;
  }
  return true;
}

function checkType(errors, data, name, type) {
  _assertContract(typeof type === "string", DBC_ERR_TYPE_PARAM_MUST_BE_STRING);
  const value = data[name];
  if (value === undefined) return true;

  if (type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(
        VAL_ERR_TYPE_MISMATCH.replace("%NAME%", name)
          .replace("%ACTUAL%", typeof value)
          .replace("%EXPECTED%", "integer")
      );
      return false;
    }
    return true;
  }

  if (type === "date") {
    if (!(value instanceof Date)) {
      errors.push(
        VAL_ERR_TYPE_MISMATCH.replace("%NAME%", name)
          .replace("%ACTUAL%", typeof value)
          .replace("%EXPECTED%", "Date")
      );
      return false;
    }
    return true;
  }

  const actualType = typeof value;
  if (actualType !== type) {
    errors.push(
      VAL_ERR_TYPE_MISMATCH.replace("%NAME%", name)
        .replace("%ACTUAL%", actualType)
        .replace("%EXPECTED%", type)
    );
    return false;
  }
  return true;
}

function checkRequired(errors, data, name, required) {
  _assertContract(
    typeof required === "boolean",
    DBC_ERR_REQUIRED_PARAM_MUST_BE_BOOL.replace("%NAME%", name)
  );
  if (required && (data[name] === undefined || data[name] === null)) {
    errors.push(VAL_ERR_FIELD_REQUIRED_MISSING.replace("%NAME%", name));
    return false;
  }
  return true;
}

function checkLength(errors, data, name, minLength, maxLength) {
  _assertContract(
    typeof name === "string" && name.length > 0,
    DBC_ERR_NAME_PARAM_REQUIRED
  );
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

  const value = data[name];
  if (value === undefined || value === null) return true;

  if (typeof value !== "string" && !Array.isArray(value)) {
    errors.push(VAL_ERR_LENGTH_CHECK_NOT_APPLICABLE.replace("%NAME%", name));
    return false;
  }

  const len = value.length;
  if (minLength !== undefined && len < minLength) {
    errors.push(
      VAL_ERR_LENGTH_TOO_SHORT.replace("%NAME%", name)
        .replace("%LEN%", len)
        .replace("%MIN%", minLength)
    );
    return false;
  }

  if (maxLength !== undefined && len > maxLength) {
    errors.push(
      VAL_ERR_LENGTH_TOO_LONG.replace("%NAME%", name)
        .replace("%LEN%", len)
        .replace("%MAX%", maxLength)
    );
    return false;
  }

  return true;
}

function checkRange(errors, data, name, minValue, maxValue) {
  _assertContract(
    typeof name === "string" && name.length > 0,
    DBC_ERR_NAME_PARAM_REQUIRED
  );
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
  _assertContract(
    !(
      minValue &&
      maxValue &&
      ((minValue instanceof Date &&
        maxValue instanceof Date &&
        minValue > maxValue) ||
        (typeof minValue === "number" &&
          typeof maxValue === "number" &&
          minValue > maxValue))
    ),
    DBC_ERR_MINVALUE_LESS_EQUAL_MAX.replace("%NAME%", name)
      .replace("%MIN%", String(minValue))
      .replace("%MAX%", String(maxValue))
  );

  const value = data[name];
  if (value === undefined || value === null) return true;

  let numericValue;
  if (value instanceof Date) {
    numericValue = value.getTime();
  } else if (typeof value === "number") {
    numericValue = value;
  } else {
    errors.push(VAL_ERR_RANGE_CHECK_NOT_APPLICABLE.replace("%NAME%", name));
    return false;
  }

  if (minValue !== undefined) {
    const min = minValue instanceof Date ? minValue.getTime() : minValue;
    if (numericValue < min) {
      errors.push(
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
      errors.push(
        VAL_ERR_RANGE_TOO_LARGE.replace("%NAME%", name)
          .replace("%VAL%", numericValue)
          .replace("%MAX%", max)
      );
      return false;
    }
  }

  return true;
}

// --- Main function ---
export default function verify(data) {
  let _errors = [];

  _assertContract(typeof data === "object", DBC_ERR_INVALID_DATA_PARAM);

  const results = {
    get errors() {
      return _errors;
    },

    isBoolean(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
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
        _errors.push(
          VAL_ERR_COMPARE_MISMATCH.replace("%NAME%", name).replace(
            "%COMPARE_TO%",
            compareTo
          )
        );
      }
      return results;
    },

    isDate(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "date") &&
        checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isEmail(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "string");

      const value = data[name];
      if (value && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          _errors.push(VAL_ERR_INVALID_EMAIL_FORMAT.replace("%NAME%", name));
        }
      }
      return results;
    },

    isEnum(name, required, values, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required);

      if (!values.includes(data[name])) {
        _errors.push(
          VAL_ERR_INVALID_ENUM_VALUE.replace("%NAME%", name)
            .replace("%VALUE%", data[name])
            .replace("%VALUES%", values.join(", "))
        );
      }
      return results;
    },

    isInteger(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "integer") &&
        checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isNumber(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "number") &&
        checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },

    isObject(name, required, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "object");
      return results;
    },

    isPassword(name, required, options = {}) {
      checkExists(_errors, data, name) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "string");

      const value = data[name];
      if (typeof value === "string") {
        const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
        if (!strong.test(value)) {
          _errors.push(VAL_ERR_PASSWORD_TOO_WEAK.replace("%NAME%", name));
        }
      }

      return results;
    },

    isMatch(name, required, regEx, defaultValue) {
      _assertContract(regEx instanceof RegExp, `DBC: regEx must be a RegExp`);
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "string");

      const value = data[name];
      if (value && !regEx.test(value)) {
        _errors.push(VAL_ERR_REGEX_NO_MATCH.replace("%NAME%", name));
      }

      return results;
    },

    isString(name, required, minLength, maxLength, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "string") &&
        checkLength(_errors, data, name, minLength, maxLength);
      return results;
    },

    isTime(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "string");

      const value = data[name];
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (value && !timeRegex.test(value)) {
        _errors.push(VAL_ERR_INVALID_TIME_FORMAT.replace("%NAME%", name));
      }
      return results;
    },

    isTimestamp(name, required, minValue, maxValue, defaultValue) {
      checkExists(_errors, data, name, defaultValue) &&
        checkRequired(_errors, data, name, required) &&
        checkType(_errors, data, name, "date") &&
        checkRange(_errors, data, name, minValue, maxValue);
      return results;
    },
  };

  return results;
}
