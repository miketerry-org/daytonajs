// deep-freeze.js:

// -----------------------------
// Helper: deep freeze
// -----------------------------
export default function deepFreeze(obj) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
