// sql-to-mongodb.js

/**
 * SQL to MongoDB Filter Converter
 *
 * Converts a SQL WHERE clause string or plain object into a MongoDB query object.
 * Relies on `sql-where-parser` for parsing the SQL expression.
 */

import parser from "sql-where-parser";

/**
 * Lightweight replacement for Lodash’s `isPlainObject`.
 * Checks if a value is a direct object literal (not an array, class instance, etc.).
 */
function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Converts a SQL WHERE clause string or plain object into a MongoDB query object.
 * @param {string|object} where - SQL WHERE clause string or plain object
 * @returns {object} MongoDB query
 */
export default function sqlToMongoDB(where) {
  if (!where) return {};
  if (isPlainObject(where)) return where; // Already a MongoDB-ready object
  if (typeof where !== "string") {
    throw new Error("[sql-to-mongodb] whereClause must be a string or object");
  }

  try {
    const ast = parser(where);
    return astToMongo(ast);
  } catch (err) {
    console.error("[sql-to-mongodb] Failed to parse SQL WHERE:", err.message);
    throw err;
  }
}

/**
 * Recursively convert SQL AST nodes to MongoDB query objects.
 * @param {object} node - SQL AST node
 * @returns {object} MongoDB query
 */
function astToMongo(node) {
  if (!node) return {};

  switch (node.type) {
    case "binary_expr": {
      const left = astToMongo(node.left);
      const right = astToMongo(node.right);

      switch (node.operator) {
        case "=":
          return { [node.left.column]: right };
        case "!=":
        case "<>":
          return { [node.left.column]: { $ne: right } };
        case ">":
          return { [node.left.column]: { $gt: right } };
        case ">=":
          return { [node.left.column]: { $gte: right } };
        case "<":
          return { [node.left.column]: { $lt: right } };
        case "<=":
          return { [node.left.column]: { $lte: right } };
        case "AND":
          return { $and: [left, right] };
        case "OR":
          return { $or: [left, right] };
        default:
          throw new Error(`Unsupported operator: ${node.operator}`);
      }
    }

    case "column_ref":
      return node.column;

    case "number":
    case "string":
      return node.value;

    default:
      throw new Error(`Unsupported AST node type: ${node.type}`);
  }
}
