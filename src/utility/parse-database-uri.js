// parse-database-uri.js

//
// parseDatabaseURI(uri)
//
// Parses a database URI into a consistent structure usable by all drivers.
// Supports:
// - mysql://user:pass@host:3306/db
// - mariadb://user:pass@host/db
// - postgres://user:pass@host/db
// - mongodb://user:pass@host:27017/db
// - sqlite:///abs/path.db
// - sqlite:relative/path.db
// - libsql://token@host
// - better-sqlite3:///path/to/file.db
//
// Returns:
// {
//   driver,
//   username,
//   password,
//   host,
//   port,
//   database,
//   path,       // for file-based DBs
//   options,    // ?key=value parsed query
//   raw         // URL object
// }

export default function parseDatabaseURI(uri) {
  if (!uri || typeof uri !== "string") {
    throw new Error("parseDatabaseURI: URI must be a non-empty string.");
  }

  let url;
  try {
    url = new URL(uri);
  } catch (err) {
    throw new Error("parseDatabaseURI: Invalid URI. " + err.message);
  }

  const driver = url.protocol.replace(":", "").toLowerCase();

  const username = url.username || null;
  const password = url.password || null;

  // URL.hostname is empty for SQLite-style URIs
  const host = url.hostname || null;

  const port = url.port ? Number(url.port) : null;

  // Extract database name (first segment of path)
  let database = null;
  if (url.pathname && url.pathname !== "/") {
    // remove leading slash
    const dbPath = url.pathname.replace(/^\//, "").trim();
    database = dbPath || null;
  }

  // Query string → options object
  const options = {};
  url.searchParams.forEach((value, key) => {
    options[key] = value;
  });

  // File-based databases (sqlite, better-sqlite3, libsql)
  let path = null;
  if (
    driver.includes("sqlite") ||
    driver === "better-sqlite3" ||
    driver === "libsql"
  ) {
    if (url.pathname) {
      // Always normalize so file path is absolute-like
      path = url.pathname.startsWith("/") ? url.pathname : "/" + url.pathname;
    }
  }

  return {
    driver,
    username,
    password,
    host,
    port,
    database,
    path,
    options,
    raw: url,
  };
}
