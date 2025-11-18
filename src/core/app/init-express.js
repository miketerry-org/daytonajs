// init-express.js

import express from "express";

export default function initExpress({ middlewares = [], routers = [] } = {}) {
  const app = express();

  // Apply middlewares
  middlewares.forEach(mw => app.use(mw));

  // Apply routers
  routers.forEach(({ path, router }) => {
    app.use(path, router);
  });

  // Catch-all 404
  app.use((req, res) => res.status(404).send("Not found"));

  return app;
}
