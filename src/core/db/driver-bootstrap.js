// driver-bootstrap.js

import DriverRegistry from "./driver-registry.js";

// Import built-in driver classes.
// These paths assume you have a /drivers folder in your project root.
import PostgresDriver from "./drivers/postgres-driver.js";
import MySQLDriver from "./drivers/mysql-driver.js";
import MariaDBDriver from "./drivers/mariadb-driver.js";
import BetterSQLiteDriver from "./drivers/better-sqlite-driver.js";
import LibSQLDriver from "./drivers/libsql-driver.js";
import MongoDriver from "./drivers/mongodb-driver.js";

/**
 * Registers all built-in database drivers into the DriverRegistry.
 * This function should be called early in the application startup,
 * typically inside Application.create() *before* tenants load.
 */
export function registerDefaultDrivers() {
  console.log("🔧 Registering database drivers...");

  DriverRegistry.add("postgres", PostgresDriver);
  DriverRegistry.add("mysql", MySQLDriver);
  DriverRegistry.add("mariadb", MariaDBDriver);
  DriverRegistry.add("sqlite", SQLiteDriver);
  DriverRegistry.add("libsql", LibSQLDriver);
  DriverRegistry.add("mongodb", MongoDriver);

  console.log("✅ Database drivers registered:", DriverRegistry.list());
}

/**
 * Allows user applications to register additional drivers
 * from their own configuration or plugin system.
 *
 * Example:
 *   registerCustomDrivers({
 *     mycustomdb: "./drivers/customdb.js"
 *   })
 *
 * @param {Object<string,string>} driverMap - Map of driverName → modulePath
 */
export async function registerCustomDrivers(driverMap = {}) {
  if (typeof driverMap !== "object" || driverMap === null) {
    throw new TypeError("driverMap must be an object of name → modulePath");
  }

  for (const [name, modulePath] of Object.entries(driverMap)) {
    try {
      const mod = await import(modulePath);
      const DriverClass = mod.default;

      DriverRegistry.add(name, DriverClass);
      console.log(`🔧 Custom driver registered: ${name} (${modulePath})`);
    } catch (err) {
      console.error(`❌ Failed to register custom driver "${name}"`, err);
    }
  }

  console.log("📦 Final driver list:", DriverRegistry.list());
}
