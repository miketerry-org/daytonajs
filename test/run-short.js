#!/usr/bin/env node
// run-short.js
// Usage: ./run-short.js path/to/your/script.js

import path from "path";
import { pathToFileURL } from "url";

const [, , scriptPath, ...args] = process.argv;

if (!scriptPath) {
  console.error("Usage: run-short.js <script.js> [args...]");
  process.exit(1);
}

const cwd = process.cwd();

function shortenStack(err) {
  if (!err.stack) return;
  const lines = err.stack.split("\n");
  const shortened = lines.map(line => {
    // Match full paths in parentheses: (full/path/to/file.js:line:col)
    return line.replace(/\((\/.*?)(:\d+:\d+)\)/g, (_, fullPath, pos) => {
      const rel = path.relative(cwd, fullPath);
      return `(${rel}${pos})`;
    });
  });
  return shortened.join("\n");
}

async function run() {
  try {
    const moduleURL = pathToFileURL(path.resolve(scriptPath)).href;
    await import(moduleURL);
  } catch (err) {
    console.error(shortenStack(err));
    process.exit(1);
  }
}

run();
