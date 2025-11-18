// config-loader.js

import fs from "fs";
import path from "path";
import * as TOML from "@iarna/toml";
import crypto from "crypto";

const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";

// Read encrypted TOML file and parse
export default class ConfigLoader {
  constructor(file = "config.toml.secret", key) {
    this.file = path.resolve(process.cwd(), file);
    this.key = key;
    if (!fs.existsSync(this.file)) {
      throw new Error(`${this.file} not found`);
    }
  }

  load() {
    const encrypted = fs.readFileSync(this.file);
    const decrypted = this.#decrypt(encrypted);
    const config = TOML.parse(decrypted.toString("utf8"));

    // Simple verification
    if (!config.server || !config.tenants) {
      throw new Error("Invalid config: missing server or tenants");
    }

    // Normalize tenant domains
    config.tenants = config.tenants.map(t => ({
      ...t,
      domain: t.domain.toLowerCase(),
    }));

    return config;
  }

  #decrypt(encrypted) {
    if (!this.key) throw new Error("Encryption key required for config");
    const iv = encrypted.slice(0, IV_LENGTH);
    const content = encrypted.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(this.key, "hex"),
      iv
    );
    return Buffer.concat([decipher.update(content), decipher.final()]);
  }
}
