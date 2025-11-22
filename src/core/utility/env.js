// env.js:

// Load environment variables quietly, overriding existing values
import dotenv from "dotenv";
dotenv.config({ quiet: true, override: true });

// -----------------------------
// Helper: deep freeze
// -----------------------------
function deepFreeze(obj) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

// -----------------------------
// Normalize NODE_ENV
// -----------------------------
const rawMode = process.env.NODE_ENV?.toLowerCase() || "production";

// -----------------------------
// Verbose mode (CLI: --verbose or -V)
// -----------------------------
export const verboseMode =
  process.argv.includes("--verbose") || process.argv.includes("-V");

// ANSI colors (safe even if terminal doesn't support them)
const colorDim = "\x1b[2m";
const colorBlue = "\x1b[34m";
const colorReset = "\x1b[0m";

// -----------------------------
// Build console.verbose API
// -----------------------------
console.verbose = (...args) => {
  if (verboseMode) {
    const timestamp = `${colorDim}${new Date().toISOString()}${colorReset}`;
    console.log(`${colorBlue}[VERBOSE]${colorReset}`, timestamp, ...args);
  }
};

// Grouping
console.verbose.group = (label = "") => {
  if (verboseMode) {
    console.group(`${colorBlue}[VERBOSE]${colorReset} ${label}`);
  }
};
console.verbose.groupEnd = () => {
  if (verboseMode) console.groupEnd();
};

// Pretty JSON
console.verbose.json = (label, obj) => {
  if (!verboseMode) return;

  const timestamp = `${colorDim}${new Date().toISOString()}${colorReset}`;
  console.log(
    `${colorBlue}[VERBOSE JSON]${colorReset}`,
    timestamp,
    label || ""
  );
  console.log(JSON.stringify(obj, null, 2));
};

// Timers
const verboseTimers = new Map();

console.verbose.time = (label = "default") => {
  if (!verboseMode) return;
  verboseTimers.set(label, performance.now());
};

console.verbose.timeEnd = (label = "default") => {
  if (!verboseMode) return;

  if (!verboseTimers.has(label)) {
    console.verbose(`No such verbose timer: ${label}`);
    return;
  }

  const start = verboseTimers.get(label);
  const ms = (performance.now() - start).toFixed(2);
  verboseTimers.delete(label);

  const timestamp = `${colorDim}${new Date().toISOString()}${colorReset}`;
  console.log(
    `${colorBlue}[VERBOSE TIMER]${colorReset}`,
    timestamp,
    `${label}: ${ms}ms`
  );
};

// Stack trace
console.verbose.trace = (...args) => {
  if (!verboseMode) return;

  const timestamp = `${colorDim}${new Date().toISOString()}${colorReset}`;
  console.trace(`${colorBlue}[VERBOSE TRACE]${colorReset}`, timestamp, ...args);
};

// -----------------------------
// Environment flags
// -----------------------------
const rawEnv = {
  mode: rawMode,
  isDevelopment: rawMode === "development",
  isTesting: rawMode === "testing",
  isStaging: rawMode === "staging",
  isProduction: rawMode === "production",

  // expose verbose mode
  verboseMode,
};

// -----------------------------
// Deep freeze to make env immutable
// -----------------------------
export const env = deepFreeze(rawEnv);
export default env;
