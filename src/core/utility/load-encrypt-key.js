// load-dotenv-file.js:

// load all necessary modules
import fs from "fs";
import path from "path";

// get full path and name for the dotenv file
const filename = path.join(process.cwd(), ".env");

if (fs.existsSync(filename)) {
  let buffer = fs.readFileSync(filename).toString();

  // Parse .env buffer into process.env
  const lines = buffer.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();

    // skip empty lines or comments
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    // split on first '=' only
    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    // assign to environment
    process.env[key] = value;
  }
}

// ensure encryption key is in environment variables
if (!process.env.ENCRYPT_KEY || process.env.ENCRYPT_KEY.length !== 64) {
  throw new Error(
    `The "ENCRYPT_KEY" environment variable must exist and have a length of64`
  );
}

const encryptKey = process.env.ENCRYPT_KEY;

export default encryptKey;
