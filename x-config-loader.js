import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as TOML from "@iarna/toml";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

// Load and decrypt config.toml.secret
export default class ConfigLoader {
  constructor(
    filename = "config.toml.secret",
    encryptKey = process.env.CONFIG_KEY
  ) {
    this.filename = path.resolve(process.cwd(), filename);
    this.encryptKey = encryptKey;

    if (!fs.existsSync(this.filename)) {
      throw new Error(`Configuration file not found: ${this.filename}`);
    }

    if (!this.encryptKey) {
      throw new Error(
        "Missing CONFIG_KEY environment variable for decrypting config"
      );
    }

    this.config = this.load();
  }

  load() {
    const fileContent = fs.readFileSync(this.filename);
    const decrypted = this.decrypt(fileContent, this.encryptKey);
    return TOML.parse(decrypted.toString("utf8"));
  }

  decrypt(encryptedData, keyHex) {
    const iv = encryptedData.slice(0, IV_LENGTH);
    const encryptedText = encryptedData.slice(IV_LENGTH);
    const key = Buffer.from(keyHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  }

  get server() {
    return this.config.server || {};
  }

  get tenants() {
    return this.config.tenants || [];
  }

  get fullConfig() {
    return this.config;
  }
}
