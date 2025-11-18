// init-express.js
import express from "express";

export default function initExpress(config, options = {}) {
  const app = express();

  // Apply middlewares if any
  if (Array.isArray(options.middlewares)) {
    options.middlewares.forEach(mw => app.use(mw));
  }

  // Example: attach tenants and serverConfig to app.locals
  app.locals.tenants = options.tenants || [];
  app.locals.serverConfig = options.serverConfig || {};

  // More setup based on config...

  return app;
}
