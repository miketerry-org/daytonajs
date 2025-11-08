import Config from "../core/utility/Config.js";
import Mongodriver from "../core/db/drivers/mongodb-driver.js";
import ServerConfigModel from "../feature/server-config/server-config-model.js";

async function mainloop() {
  const database_uri = "mongodb://localhost:27017/test";
  const config = Config.createFromObject({ database_uri });
  const driver = new Mongodriver(config);

  try {
    await driver.connect();

    const model = new ServerConfigModel(driver);
    model.id = 1;
    model.node_id = 1;
    // model.http_port = 8080;
    // model.db_uri = database_uri;
    // model.log_name = "main";
    // model.session_secret = "mysupersecret";
    // model.static_path = "public";
    // model.views_path = "views";
    // model.views_default_layout = "main";
    // model.views_layouts_path = "layouts";
    // model.views_partials_path = "partials";
    // model.emails_templates_path = "emails";
    // ...other fields...

    console.log("after assign", model.data);
    console.log("Inserting:", model.toObject());
    const result = await model.insert();
    console.log("Inserted record:", result);
  } catch (err) {
    console.error("Seeder error:", err);
  } finally {
    await driver.disconnect();
  }
}

await mainloop();
