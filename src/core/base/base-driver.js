// base-driver.js

import BaseClass from "./base-class.js";

/**
 * BaseDriver
 * Abstract class that all database drivers should extend.
 * Handles common config management and utilities.
 */
export default class BaseDriver extends BaseClass {
  /* =============================================================
   * Table / Collection Naming
   * ============================================================= */
  static toSnakeCasePlural(name, capitalize = false) {
    if (!name) return "";
    const snake = name
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      .toLowerCase();

    const plural = snake.endsWith("s") ? snake : snake + "s";

    if (capitalize) {
      return plural.charAt(0).toUpperCase() + plural.slice(1);
    }
    return plural;
  }

  formatTableName(modelName) {
    return BaseDriver.toSnakeCasePlural(modelName, false);
  }

  formatPrimaryKey(logicalKey = "id") {
    return logicalKey;
  }
}
