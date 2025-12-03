// logger-factory.js:

import ConsoleLogger from "./console-logger.js";
import FileLogger from "./file-logger.js";
import MongoDBLogger from "./mongodb-logger.js";

export default class LoggerFactory {
  static createLogger() {
    const cfg = system.config.server;

    if (!cfg) {
      throw new Error("system.config.server is not defined");
    }

    const type = cfg.log_type || "console";
    const level = cfg.log_level || "debug";

    switch (type) {
      case "console":
        return new ConsoleLogger(level);

      case "file":
        if (!cfg.log_file_path) {
          throw new Error(
            "FileLogger requires 'log_file_path' in system.config.server"
          );
        }
        return new FileLogger(cfg.log_file_path, level);

      case "mongodb":
        if (!cfg.database_uri || !cfg.database_name) {
          throw new Error(
            "MongoDBLogger requires 'database_uri' and 'database_name' in system.config.server"
          );
        }
        return new MongoDBLogger({
          uri: cfg.database_uri,
          dbName: cfg.database_name,
          collectionName: cfg.log_table_name || "logs",
          level,
        });

      default:
        console.warn(
          `Unknown logger type "${type}", defaulting to ConsoleLogger`
        );
        return new ConsoleLogger(level);
    }
  }
}
