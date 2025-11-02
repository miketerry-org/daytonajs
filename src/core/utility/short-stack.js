// short-stack.js

// Import this as the first import in your app to shorten project file paths in stack traces

import path from "path";

const originalPrepareStackTrace = Error.prepareStackTrace;
const cwd = process.cwd();

function isProjectFile(fileName) {
  if (!fileName) return false;
  // Ignore node internal files and node_modules
  return (
    !fileName.includes("node_modules") &&
    !fileName.startsWith("internal") &&
    !fileName.startsWith("node:")
  );
}

Error.prepareStackTrace = (err, structuredStackTrace) => {
  const frames = structuredStackTrace.map(frame => {
    let fileName = frame.getFileName();
    if (isProjectFile(fileName)) {
      fileName = path.relative(cwd, fileName);
    }

    const functionName = frame.getFunctionName() || "<anonymous>";
    const typeName = frame.getTypeName();
    const methodName = frame.getMethodName();
    const lineNumber = frame.getLineNumber();
    const columnNumber = frame.getColumnNumber();

    let location = "";

    if (fileName) {
      location = `${fileName}:${lineNumber}:${columnNumber}`;
    } else if (frame.isNative()) {
      location = "native";
    } else {
      location = "unknown";
    }

    // Include typeName if methodName is available
    const fullFunctionName =
      methodName && typeName ? `${typeName}.${methodName}` : functionName;

    return `    at ${fullFunctionName} (${location})`;
  });

  const message = `${err.name}: ${err.message}`;
  return [message, ...frames].join("\n");
};

// Optional: handle unhandled rejections gracefully
process.on("unhandledRejection", reason => {
  if (reason instanceof Error) {
    console.error(reason.stack);
  } else {
    console.error(reason);
  }
});
