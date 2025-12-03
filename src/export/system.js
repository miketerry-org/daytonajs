// system.js

import dotenv from "dotenv";
dotenv.config({ quiet: true, override: true });

import addGetters from "../utility/add-Getters.js";
import deepFreeze from "../utility/deep-freeze.js";
import ConfigLoader from "../loader/config-loader.js";

// -----------------------------
// Normalize NODE_ENV
// -----------------------------
const envMode = process.env.NODE_ENV?.toLowerCase() || "production";

// -----------------------------
// Base system object
// -----------------------------
const system = {
  envMode,
  isDevelopment: envMode === "development",
  isTesting: envMode === "testing",
  isStaging: envMode === "staging",
  isProduction: envMode === "production",
};

// -----------------------------
// Mutable log property (getter/setter)
// Must be added BEFORE freezing
// -----------------------------
let _log = null;

Object.defineProperty(system, "log", {
  get() {
    return _log;
  },
  set(value) {
    _log = value;
  },
  enumerable: true,
});

// -----------------------------
// Load and attach config
// -----------------------------
try {
  const loader = new ConfigLoader();
  system.config = loader.load();
  console.log("system.config", system.config.server);

  // Attach getter helpers to server config section
  if (system.config?.server) {
    addGetters(system.config.server);
  }
} catch (err) {
  console.error("❌ Failed to load system.config:", err.message);
  system.config = null;
}

// -----------------------------
// Freeze final system object
// -----------------------------
// deepFreeze(system);

// -----------------------------
// Export the system object
// -----------------------------
export default system;
