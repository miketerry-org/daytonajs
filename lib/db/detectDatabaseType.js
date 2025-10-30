// detectDatabaseType.js:

"use strict";

/**
 * Identify the database type from a connection string (URI)
 *
 * Returns one of:
 *   "mongodb", "postgres", "mysql", "mariadb", "sqlite", or null
 */
export default function detectDatabaseType(connectionString) {
  if (typeof connectionString !== "string") {
    return null;
  }

  const lower = connectionString.toLowerCase().trim();

  // MongoDB (standard and Atlas SRV)
  if (lower.startsWith("mongodb://") || lower.startsWith("mongodb+srv://")) {
    return "mongodb";
  }

  // PostgreSQL
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return "postgres";
  }

  // MySQL
  if (lower.startsWith("mysql://")) {
    return "mysql";
  }

  // MariaDB
  if (lower.startsWith("mariadb://")) {
    return "mariadb";
  }

  // SQLite and libSQL
  if (
    lower.startsWith("sqlite://") ||
    lower.startsWith("sqlite:") ||
    lower.startsWith("file:") ||
    lower.startsWith("libsql://") ||
    (lower.startsWith("https://") && lower.includes(".libsql."))
  ) {
    return "sqlite";
  }

  // Unknown / unsupported
  return null;
}
