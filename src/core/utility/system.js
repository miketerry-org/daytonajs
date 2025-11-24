// system.js:

// Load environment variables quietly, overriding existing values
import dotenv from "dotenv";
dotenv.config({ quiet: true, override: true });

import deepFreeze from "./deep-freeze.js";

// -----------------------------
// Normalize NODE_ENV
// -----------------------------
const rawMode = process.env.NODE_ENV?.toLowerCase() || "production";

// -----------------------------
// Environment flags
// -----------------------------
const rawEnv = {
  mode: rawMode,
  isDevelopment: rawMode === "development",
  isTesting: rawMode === "testing",
  isStaging: rawMode === "staging",
  isProduction: rawMode === "production",
};

// -----------------------------
// Deep freeze to make env immutable
// -----------------------------
export const env = deepFreeze(rawEnv);
export default env;
