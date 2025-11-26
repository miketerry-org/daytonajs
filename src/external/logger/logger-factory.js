// logger-factory.js:

import ConsoleLogger from "./console-logger.js";
import FileLogger from "./file-logger.js";
import MongoDBLogger from "./mongodb-logger.js";

export default class LoggerFactory {
  static createLogger() {
    const cfg = globalThis.system?.config;

    if (!cfg) {
      throw new Error("system.config is not defined");
    }

    const type = cfg.log_type || "console";
    const level = cfg.log_level || "debug";

    switch (type) {
      case "console":
        return new ConsoleLogger(level);

      case "file":
        if (!cfg.log_filePath) {
          throw new Error(
            "FileLogger requires 'log_filePath' in system.config"
          );
        }
        return new FileLogger(cfg.log_filePath, level);

      case "mongodb":
        if (!cfg.log_mongoUri || !cfg.log_mongoDbName) {
          throw new Error(
            "MongoDBLogger requires 'log_mongoUri' and 'log_mongoDbName' in system.config"
          );
        }
        return new MongoDBLogger({
          uri: cfg.log_mongoUri,
          dbName: cfg.log_mongoDbName,
          collectionName: cfg.log_mongoCollection || "logs",
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
