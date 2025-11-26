// system.js

import dotenv from "dotenv";
dotenv.config({ quiet: true, override: true });

import deepFreeze from "../internal/utility/deep-freeze.js";
import ConfigLoader from "../internal/loader/config-loader.js";

// -----------------------------
// Normalize NODE_ENV
// -----------------------------
const envMode = process.env.NODE_ENV?.toLowerCase() || "production";

// -----------------------------
// Environment flags
// -----------------------------
const system = {
  envMode,
  isDevelopment: envMode === "development",
  isTesting: envMode === "testing",
  isStaging: envMode === "staging",
  isProduction: envMode === "production",
};

// -----------------------------
// Add mutable "log" via getter/setter BEFORE freeze
// This property will still be writable after deepFreeze()
// -----------------------------
let _log = null; // private backing store for "log"

Object.defineProperty(system, "log", {
  get() {
    return _log;
  },
  set(value) {
    _log = value;
  },
  enumerable: true,
  configurable: false,
});

// -----------------------------
// Load and attach config
// -----------------------------
try {
  const loader = new ConfigLoader();
  system.config = loader.load();
} catch (err) {
  console.error("❌ Failed to load system.config:", err.message);
  system.config = null;
}

// -----------------------------
// Freeze system object
// -----------------------------
deepFreeze(system);

// -----------------------------
// Attach to global object safely
// -----------------------------
if (!global.system) {
  global.system = system;
}

export default system;
export { system };
