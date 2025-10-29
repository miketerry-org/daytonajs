// assert.js
"use strict";

import util from "util";

class AssertionError extends Error {
  constructor({ actual, expected, message, operator, stackStartFn }) {
    super();
    if (message !== undefined && message !== null) {
      this.message = message;
      this.generatedMessage = false;
    } else {
      this.message = `${util.inspect(actual)} ${operator} ${util.inspect(
        expected
      )}`;
      this.generatedMessage = true;
    }
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
    this.operator = operator;
    this.code = "ERR_ASSERTION";
    Error.captureStackTrace(this, stackStartFn || AssertionError);
  }
}

function fail(actual, expected, message, operator, stackStartFn) {
  throw new AssertionError({
    actual,
    expected,
    message,
    operator,
    stackStartFn,
  });
}

// Basic assertions
function ok(value, message) {
  if (!value) {
    fail(value, true, message, "==", ok);
  }
}

function equal(actual, expected, message) {
  if (actual != expected && !(actual !== actual && expected !== expected)) {
    fail(actual, expected, message, "==", equal);
  }
}

function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, "!=", notEqual);
  }
}

function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, "===", strictEqual);
  }
}

function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, "!==", notStrictEqual);
  }
}

function deepEqual(actual, expected, message) {
  const isDeep = util.isDeepEqual
    ? util.isDeepEqual(actual, expected)
    : util.isDeepStrictEqual(actual, expected);
  if (!isDeep) {
    fail(actual, expected, message, "deepEqual", deepEqual);
  }
}

function notDeepEqual(actual, expected, message) {
  const isDeep = util.isDeepEqual
    ? util.isDeepEqual(actual, expected)
    : util.isDeepStrictEqual(actual, expected);
  if (isDeep) {
    fail(actual, expected, message, "notDeepEqual", notDeepEqual);
  }
}

function deepStrictEqual(actual, expected, message) {
  if (!util.isDeepStrictEqual(actual, expected)) {
    fail(actual, expected, message, "deepStrictEqual", deepStrictEqual);
  }
}

function notDeepStrictEqual(actual, expected, message) {
  if (util.isDeepStrictEqual(actual, expected)) {
    fail(actual, expected, message, "notDeepStrictEqual", notDeepStrictEqual);
  }
}

function ifError(err) {
  if (err != null) {
    throw err;
  }
}

// Exception / throwing assertions
function throws(block, expected, message) {
  let caught;
  try {
    block();
  } catch (err) {
    caught = err;
  }
  if (!caught) {
    fail(
      undefined,
      expected,
      message || "Missing expected exception",
      "throws",
      throws
    );
  }
  if (expected) {
    if (!errorMatches(caught, expected)) {
      throw new AssertionError({
        actual: caught,
        expected,
        message: message || "Thrown error does not match expected",
        operator: "throws",
        stackStartFn: throws,
      });
    }
  }
  return; // success
}

function doesNotThrow(block, expected, message) {
  try {
    block();
  } catch (err) {
    if (!expected || errorMatches(err, expected)) {
      fail(
        err,
        undefined,
        message || "Got unwanted exception",
        "doesNotThrow",
        doesNotThrow
      );
    } else {
      // thrown error but doesn't match expected, rethrow
      throw err;
    }
  }
}

// Async / promise rejections
async function rejects(asyncFn, expected, message) {
  let caught;
  try {
    await asyncFn();
  } catch (err) {
    caught = err;
  }
  if (!caught) {
    fail(
      undefined,
      expected,
      message || "Missing expected rejection",
      "rejects",
      rejects
    );
  }
  if (expected) {
    if (!errorMatches(caught, expected)) {
      throw new AssertionError({
        actual: caught,
        expected,
        message: message || "Promise rejection does not match expected",
        operator: "rejects",
        stackStartFn: rejects,
      });
    }
  }
  return; // success
}

async function doesNotReject(asyncFn, expected, message) {
  try {
    await asyncFn();
  } catch (err) {
    if (!expected || errorMatches(err, expected)) {
      fail(
        err,
        undefined,
        message || "Got unwanted rejection",
        "doesNotReject",
        doesNotReject
      );
    } else {
      throw err;
    }
  }
}

// Matching / pattern assertions
function match(str, regex, message) {
  if (!(regex instanceof RegExp)) {
    throw new TypeError("Expected must be a RegExp");
  }
  if (!regex.test(str)) {
    fail(str, regex, message || "String does not match RegExp", "match", match);
  }
}

function doesNotMatch(str, regex, message) {
  if (!(regex instanceof RegExp)) {
    throw new TypeError("Expected must be a RegExp");
  }
  if (regex.test(str)) {
    fail(
      str,
      regex,
      message || "String matches RegExp",
      "doesNotMatch",
      doesNotMatch
    );
  }
}

// Helper to match errors to expected patterns/types
function errorMatches(err, expected) {
  if (typeof expected === "function") {
    return err instanceof expected;
  }
  if (expected instanceof RegExp) {
    return expected.test(err.message);
  }
  if (typeof expected === "object" && expected !== null) {
    return Object.keys(expected).every(key => {
      if (expected[key] instanceof RegExp) {
        return expected[key].test(err[key]);
      }
      return err[key] === expected[key];
    });
  }
  return false;
}

// The “expect” style API
function expect(value) {
  return {
    toBe: (expected, message) => strictEqual(value, expected, message),
    notToBe: (expected, message) => notStrictEqual(value, expected, message),
    toEqual: (expected, message) => deepStrictEqual(value, expected, message),
    notToEqual: (expected, message) =>
      notDeepStrictEqual(value, expected, message),
    toStrictEqual: (expected, message) =>
      deepStrictEqual(value, expected, message),
    notToStrictEqual: (expected, message) =>
      notDeepStrictEqual(value, expected, message),

    toBeTruthy: message => {
      if (!value) {
        fail(
          value,
          true,
          message || `Expected ${util.inspect(value)} to be truthy`,
          "toBeTruthy",
          expect
        );
      }
    },
    toBeFalsy: message => {
      if (value) {
        fail(
          value,
          false,
          message || `Expected ${util.inspect(value)} to be falsy`,
          "toBeFalsy",
          expect
        );
      }
    },
    toBeNull: message => {
      strictEqual(
        value,
        null,
        message || `Expected value to be null`,
        "toBeNull",
        expect
      );
    },
    toBeUndefined: message => {
      strictEqual(
        value,
        undefined,
        message || `Expected value to be undefined`,
        "toBeUndefined",
        expect
      );
    },
    toBeDefined: message => {
      if (value === undefined) {
        fail(
          value,
          undefined,
          message || `Expected value to be defined (not undefined)`,
          "toBeDefined",
          expect
        );
      }
    },

    toMatch: (regex, message) => match(value, regex, message),
    notToMatch: (regex, message) => doesNotMatch(value, regex, message),

    toThrow: (expected, message) => {
      if (typeof value !== "function") {
        fail(
          value,
          "function",
          message || "Value is not a function for toThrow",
          "toThrow",
          expect
        );
      }
      throws(value, expected, message);
    },
    notToThrow: (expected, message) => {
      if (typeof value !== "function") {
        fail(
          value,
          "function",
          message || "Value is not a function for notToThrow",
          "notToThrow",
          expect
        );
      }
      doesNotThrow(value, expected, message);
    },

    toReject: async (expected, message) => {
      if (typeof value !== "function") {
        fail(
          value,
          "function",
          message || "Value is not a function returning a promise for toReject",
          "toReject",
          expect
        );
      }
      await rejects(value, expected, message);
    },
    notToReject: async (expected, message) => {
      if (typeof value !== "function") {
        fail(
          value,
          "function",
          message ||
            "Value is not a function returning a promise for notToReject",
          "notToReject",
          expect
        );
      }
      await doesNotReject(value, expected, message);
    },

    toContain: (item, message) => {
      if (!Array.isArray(value) && typeof value !== "string") {
        fail(
          value,
          item,
          message || "Value is not array or string for toContain",
          "toContain",
          expect
        );
      }
      if (Array.isArray(value)) {
        if (!value.includes(item)) {
          fail(
            value,
            item,
            message || `Expected array to contain ${util.inspect(item)}`,
            "toContain",
            expect
          );
        }
      } else {
        // string
        if (!value.includes(item)) {
          fail(
            value,
            item,
            message || `Expected string "${value}" to contain "${item}"`,
            "toContain",
            expect
          );
        }
      }
    },

    toHaveLength: (len, message) => {
      if (value == null || typeof value.length !== "number") {
        fail(
          value,
          len,
          message || "Value has no length property",
          "toHaveLength",
          expect
        );
      }
      strictEqual(
        value.length,
        len,
        message || `Expected length ${len}, got ${value.length}`,
        "toHaveLength",
        expect
      );
    },

    // convenience “not” object for negation
    not: {
      toBe: (exp, msg) => notStrictEqual(value, exp, msg),
      toEqual: (exp, msg) => notDeepStrictEqual(value, exp, msg),
      toStrictEqual: (exp, msg) => notDeepStrictEqual(value, exp, msg),
      toMatch: (rx, msg) => doesNotMatch(value, rx, msg),
      toThrow: (exp, msg) => {
        if (typeof value !== "function") {
          fail(
            value,
            "function",
            msg || "Value is not a function for notToThrow",
            "notToThrow",
            expect
          );
        }
        doesNotThrow(value, exp, msg);
      },
      toContain: (item, msg) => {
        if (!Array.isArray(value) && typeof value !== "string") {
          fail(
            value,
            item,
            msg || "Value is not array or string for toContain",
            "toContain",
            expect
          );
        }
        if (Array.isArray(value)) {
          if (value.includes(item)) {
            fail(
              value,
              item,
              msg || `Expected array not to contain ${util.inspect(item)}`,
              "not.toContain",
              expect
            );
          }
        } else {
          if (value.includes(item)) {
            fail(
              value,
              item,
              msg || `Expected string "${value}" not to contain "${item}"`,
              "not.toContain",
              expect
            );
          }
        }
      },
      toHaveLength: (len, msg) => {
        if (value == null || typeof value.length !== "number") {
          fail(
            value,
            len,
            msg || "Value has no length property",
            "toHaveLength",
            expect
          );
        }
        if (value.length === len) {
          fail(
            value.length,
            len,
            msg || `Expected length not ${len}`,
            "not.toHaveLength",
            expect
          );
        }
      },
    }, // end not
  };
}

// The main assert function (alias for ok)
function assert(value, message) {
  ok(value, message);
}

// Attach methods to assert
assert.fail = fail;
assert.ok = ok;
assert.equal = equal;
assert.notEqual = notEqual;
assert.strictEqual = strictEqual;
assert.notStrictEqual = notStrictEqual;
assert.deepEqual = deepEqual;
assert.notDeepEqual = notDeepEqual;
assert.deepStrictEqual = deepStrictEqual;
assert.notDeepStrictEqual = notDeepStrictEqual;
assert.ifError = ifError;
assert.throws = throws;
assert.doesNotThrow = doesNotThrow;
assert.rejects = rejects;
assert.doesNotReject = doesNotReject;
assert.match = match;
assert.doesNotMatch = doesNotMatch;
assert.expect = expect;
assert.AssertionError = AssertionError;

// `.strict` variant grouping
assert.strict = {
  fail,
  ok,
  equal: strictEqual,
  notEqual: notStrictEqual,
  strictEqual,
  notStrictEqual,
  deepEqual: deepStrictEqual,
  notDeepEqual: notDeepStrictEqual,
  throws,
  doesNotThrow,
  rejects,
  doesNotReject,
  ifError,
  match,
  doesNotMatch,
  expect,
  AssertionError,
};

export default assert;
