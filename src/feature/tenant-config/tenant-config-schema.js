// tenant-config-schema.js

import Schema from "../../core/utility/schema.js";

const modeNames = ["production", "staging", "development", "testing"];
const site_role_names = ["Guest", "client", "coach", "admin"];

const TenantConfigSchema = new Schema()
  .addInteger("node_id", { type: "integer" })
  .addInteger("node_id", true, 1, 10000)
  .addEnum("mode", true, modeNames, modeNames[0])
  .addString("domain", true, 1, 255)
  .addString("database_uri", true, 1, 255)
  .addString("log_table_name", true, 1, 255)
  .addInteger("log_expiration_days", true, 1, 365, 90)
  .addBoolean("log_capped", true, false)
  .addInteger("log_max_size", false, 1, 1000000, 1000)
  .addInteger("log_max_docs", false, 1000000, 10000)
  .addString("site_title", true, 1, 255)
  .addString("site_slogan", true, 1, 255)
  .addString("site_choach_fullname", true, 1, 255)
  .addString("site_coatch_email", true, 1, 255)
  .addString("site_support_email", true, 1, 255)
  .addString("site_support_url", true, 1, 255)
  .addString("site_owner", true, 1, 255)
  .addString("site_author_name", true, 1, 255)
  .addString("site_author_url", true, 1, 255);
addInteger("site_copyright", true, 2025, 3000)
  .addEnum("site_roles", true, site_role_names, "Guest")
  .addString("postmark_api_key", true, 1, 255);

export default TenantConfigSchema;
