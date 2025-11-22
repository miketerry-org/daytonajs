// env.js
import dotenv from "dotenv";

// Load environment variables quietly, overriding existing values if present
dotenv.config({ quiet: true, override: true });

/**
 * Recursively deep-freezes an object to make it fully immutable.
 * @param {object} obj
 * @returns {object} frozen object
 */
function deepFreeze(obj) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

// Normalize NODE_ENV once
const rawMode = process.env.NODE_ENV?.toLowerCase() || "production";

// Determine debugMode from environment variable or CLI argument
const debugMode =
  process.env.DEBUG_MODE?.toLowerCase() === "true" ||
  process.argv.includes("--debug") ||
  process.argv.includes("-D");

// Validate SERVER_NODE
const serverNodeRaw = process.env.SERVER_NODE;
const serverNode = parseInt(serverNodeRaw, 10);

if (!Number.isInteger(serverNode) || serverNode < 1 || serverNode > 1000) {
  throw new Error(
    `The "SERVER_NODE" environment variable must be an integer between 1 and 1000. Received: "${serverNodeRaw}"`
  );
}

// Ensure the encryption key is defined and has valid length
const configEncryptKey = process.env.CONFIG_ENCRYPT_KEY || "";
if (configEncryptKey.length !== 64) {
  throw new Error(
    `The "CONFIG_ENCRYPT_KEY" environment variable must be defined and have length 64.`
  );
}

// Build the environment descriptor
const rawEnv = {
  mode: rawMode,
  isDevelopment: rawMode === "development",
  isTesting: rawMode === "testing",
  isStaging: rawMode === "staging",
  isProduction: rawMode === "production",
  debugMode,
  serverNode,
  configEncryptKey,
};

// Deep freeze to guarantee total read-only immutability
export const env = deepFreeze(rawEnv);

// Optional: default export for convenience
export default env;
