// sqlToMongo.js

import SqlWhereParser from "sql‑where‑parser"; // npm install sql‑where‑parser

/**
 * Converts a SQL WHERE clause string into a MongoDB filter object.
 * Supports operators for v1: =, !=/<>, >, >=, <, <=, LIKE, IN, NOT IN, BETWEEN, IS NULL, IS NOT NULL,
 * logical: AND, OR, NOT, parenthesis grouping.
 * @param {string} whereStr — the WHERE clause (without the “WHERE” keyword)
 * @returns {object} — Mongo‑compatible filter object
 * @throws {Error} if unsupported syntax encountered
 */
export function sqlToMongo(whereStr) {
  if (typeof whereStr !== "string") {
    throw new Error("sqlToMongo: argument must be a string");
  }

  const parser = new SqlWhereParser();
  const ast = parser.parse(whereStr);

  function convertNode(node) {
    if (node == null) {
      throw new Error("sqlToMongo: invalid AST node");
    }

    // Logical operators
    if (node.AND) {
      return { $and: node.AND.map(convertNode) };
    }
    if (node.OR) {
      return { $or: node.OR.map(convertNode) };
    }
    if (node.NOT) {
      // NOT a single condition: transform to $nor
      return { $nor: [convertNode(node.NOT)] };
    }

    // Leaf/comparison nodes
    const op = Object.keys(node)[0];
    const operands = node[op];

    // Validation
    if (!Array.isArray(operands) || operands.length < 2) {
      throw new Error(`sqlToMongo: operator ${op} has invalid operands`);
    }

    const field = operands[0];
    const val = operands[1];

    switch (op) {
      case "=":
        return { [field]: val };
      case "!=":
      case "<>":
        return { [field]: { $ne: val } };
      case ">":
        return { [field]: { $gt: val } };
      case ">=":
        return { [field]: { $gte: val } };
      case "<":
        return { [field]: { $lt: val } };
      case "<=":
        return { [field]: { $lte: val } };
      case "IN":
        if (!Array.isArray(val)) {
          throw new Error("sqlToMongo: IN requires array of values");
        }
        return { [field]: { $in: val } };
      case "NOT IN":
        if (!Array.isArray(val)) {
          throw new Error("sqlToMongo: NOT IN requires array of values");
        }
        return { [field]: { $nin: val } };
      case "LIKE": {
        if (typeof val !== "string") {
          throw new Error("sqlToMongo: LIKE requires string pattern");
        }
        // convert SQL LIKE pattern to regex
        let pattern = val;
        // remove quotes if present
        pattern = pattern.replace(/^["']|["']$/g, "");
        // convert % -> .* , _ -> .
        pattern = pattern.replace(/%/g, ".*").replace(/_/g, ".");
        return { [field]: { $regex: `^${pattern}$`, $options: "i" } };
      }
      case "BETWEEN": {
        if (!Array.isArray(val) || val.length !== 2) {
          throw new Error("sqlToMongo: BETWEEN requires [low, high]");
        }
        const [low, high] = val;
        return { [field]: { $gte: low, $lte: high } };
      }
      case "NOT BETWEEN": {
        if (!Array.isArray(val) || val.length !== 2) {
          throw new Error("sqlToMongo: NOT BETWEEN requires [low, high]");
        }
        const [l2, h2] = val;
        return {
          $or: [{ [field]: { $lt: l2 } }, { [field]: { $gt: h2 } }],
        };
      }
      case "IS NULL":
        return { [field]: null };
      case "IS NOT NULL":
        return { [field]: { $ne: null } };
      default:
        throw new Error(`sqlToMongo: unsupported operator: ${op}`);
    }
  }

  return convertNode(ast);
}
