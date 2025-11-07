// server-config-model.js

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import BaseModel from "../../core/base/base-model.js";

// -----------------------------------------------------------------------------
// ServerConfigModel
// -----------------------------------------------------------------------------
export default class ServerConfigModel extends BaseModel {
  defineSchema(schema) {
    schema
      .addPrimary("id", { type: "auto" })
      .addInteger("node_id", true, 1, 10000)
      .addInteger("http_port", true, 1, 65000, 80)
      .addString("db_uri", true, 1, 255)
      .addString("log_name", true, 1, 255)
      .addInteger("log_expiration_days", true, 1, 365)
      .addBoolean("log_capped", true, false)
      .addInteger("log_max_mb", true, 10, 1000, 10)
      .addInteger("log_max_entries", true, 1, 10000, 1000)
      .addInteger("rate_limit_minutes", true, 1, 60, 10)
      .addInteger("rate_limit_requests", true, 1, 1000, 200)
      .addInteger("body_limit_kb", true, 10, 1000, 10)
      .addString("session_secret", true, 32, 255)
      .addString("static_path", true, 1, 255)
      .addString("views_path", true, 1, 255)
      .addString("views_default_layout", true, 1, 255)
      .addString("views_layouts_path", true, 1, 255)
      .addString("views_partials_path", true, 1, 255)
      .addString("emails_templates_path", true, 1, 255)
      // Index on node_id
      .addIndex("node_id", { unique: true });
  }
}
