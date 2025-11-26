// short-stack.js
// Must be imported first in your project

import path from "path";
import { fileURLToPath } from "url";

// ANSI color codes for nice terminal output
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

// Convert file:// URLs to filesystem paths
function normalizeFileName(fileName) {
  if (!fileName) return null;
  if (fileName.startsWith("file://")) {
    try {
      return fileURLToPath(fileName);
    } catch {
      return null;
    }
  }
  return fileName;
}

// Determine if a file is a project file (include all project folders)
function isProjectFile(fileName) {
  if (!fileName) return false;
  // Only skip Node internals and node_modules
  return !fileName.startsWith("node:") && !fileName.includes("node_modules");
}

// Custom prepareStackTrace to shorten project paths
function shortStack(err, structuredStackTrace) {
  const frames = structuredStackTrace
    .map(frame => {
      const fileName = normalizeFileName(frame.getFileName());
      if (!isProjectFile(fileName)) return null;

      const rel = path.relative(cwd, fileName);
      const coloredPath = `${colors.cyan}${rel}${colors.reset}`;

      const fn =
        frame.getMethodName() && frame.getTypeName()
          ? `${frame.getTypeName()}.${frame.getMethodName()}`
          : frame.getFunctionName();

      if (!fn || fn === "<anonymous>") return null;

      return `    at ${fn} (${coloredPath}:${frame.getLineNumber()}:${frame.getColumnNumber()})`;
    })
    .filter(Boolean);

  return `${colors.red}${colors.bold}${err.name}${colors.reset}: ${
    err.message
  }\n${frames.join("\n")}`;
}

// Install custom prepareStackTrace
Object.defineProperty(Error, "prepareStackTrace", {
  value: shortStack,
  writable: false,
  configurable: false,
});

console.log(
  `${colors.dim}[short-stack] Error.prepareStackTrace installed!${colors.reset}`
);

// Global handlers for uncaught errors
process.on("uncaughtException", err => {
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", reason => {
  if (reason instanceof Error) console.error(reason.stack);
  else console.error(reason);
});
