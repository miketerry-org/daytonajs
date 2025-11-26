// short-stack.js
// Minimal, clean, developer-friendly stack traces

import path from "path";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

console.log(`${colors.dim}[short-stack] Loaded!${colors.reset}`);

const cwd = process.cwd();
console.log(`${colors.dim}[short-stack] Project root: ${cwd}${colors.reset}`);

// --- Utility: detect project files ---
function isProjectFile(fileName) {
  if (!fileName) return false;
  return (
    !fileName.includes("node_modules") &&
    !fileName.startsWith("internal") &&
    !fileName.startsWith("node:")
  );
}

// --- Custom stack formatter ---
function shortStack(err, structuredStackTrace) {
  const frames = structuredStackTrace
    .filter(frame => {
      const f = frame.getFileName();
      // Show only project files
      return isProjectFile(f);
    })
    .map(frame => {
      let fileName = frame.getFileName();
      if (isProjectFile(fileName)) {
        fileName = path.relative(cwd, fileName);
        fileName = `${colors.cyan}${fileName}${colors.reset}`;
      }

      const type = frame.getTypeName();
      const method = frame.getMethodName();
      const fnName =
        method && type
          ? `${type}.${method}`
          : frame.getFunctionName() || "<anonymous>";

      // Skip anonymous functions to clean the stack
      if (fnName === "<anonymous>") return null;

      const line = frame.getLineNumber();
      const col = frame.getColumnNumber();
      return `    at ${fnName} (${fileName}:${line}:${col})`;
    })
    .filter(Boolean); // remove null frames

  return `${colors.red}${colors.bold}${err.name}${colors.reset}: ${
    err.message
  }\n${frames.join("\n")}`;
}

// --- Freeze prepareStackTrace ---
Object.defineProperty(Error, "prepareStackTrace", {
  value: shortStack,
  writable: false,
  configurable: false,
});

console.log(
  `${colors.dim}[short-stack] Error.prepareStackTrace installed!${colors.reset}`
);

// --- Global handlers ---
process.on("uncaughtException", err => {
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", reason => {
  if (reason instanceof Error) {
    console.error(reason.stack);
  } else {
    console.error(reason);
  }
});
