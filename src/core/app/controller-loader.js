// controller-loader.js

import fs from "fs";
import path from "path";
import express from "express";
import BaseController from "./base-controller.js";

export default class ControllerLoader {
  constructor(root = process.cwd()) {
    this.root = root;
    this.controllers = [];
  }

  load() {
    this.#scanFolder(this.root);
    return this.controllers;
  }

  #scanFolder(folder) {
    const files = fs.readdirSync(folder, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(folder, file.name);

      if (file.isDirectory()) {
        if (file.name === "node_modules") continue;
        this.#scanFolder(fullPath);
      } else if (file.name.match(/controller\.(js|ts)$/i)) {
        const Controller = (await import(fullPath)).default;
        if (!Controller) continue;

        const router = express.Router();
        const basePath = Controller.route();

        // Map standard RESTful routes
        const instanceHandler = (method) => (req, res, next) => {
          const instance = new Controller(req, res, next);
          if (typeof instance[method] === "function") {
            instance[method]();
          } else {
            res.status(404).send("Not found");
          }
        };

        router.get("/", instanceHandler("index"));
        router.get("/:id", instanceHandler("show"));
        router.get("/new", instanceHandler("new"));
        router.post("/", instanceHandler("create"));
        router.get("/:id/edit", instanceHandler("edit"));
        router.put("/:id", instanceHandler("update"));
        router.delete("/:id", instanceHandler("delete"));

        this.controllers.push({ path: basePath, router });
      }
    }
  }
}
