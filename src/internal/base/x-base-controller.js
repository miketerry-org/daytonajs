// base-controller.js

import verify from "../utility/verify.js";

export default class BaseController {
  #req;
  #res;
  #next;
  #rendered = false;

  constructor(req, res, next) {
    this.#req = req;
    this.#res = res;
    this.#next = next;

    // Make verify function available in all controller methods
    this.verify = verify;

    // inject flash into locals for auto-render
    if (this.session) {
      res.locals.flash = this.session.flash || {};
      this.session.flash = {}; // clear after read
    }

    // Provide form repopulation automatically
    res.locals.old = this.old.bind(this);
  }

  // ============================================================================
  // REQUIRED STATIC INTERFACE
  // ============================================================================
  static route() {
    throw new Error(`"${this.name}.route()" must be implemented`);
  }

  static routes(router) {
    throw new Error(`"${this.name}.routes(router)" must be implemented`);
  }

  // ============================================================================
  // ACTION WRAPPER (called by controller-loader)
  // ============================================================================
  static action(methodName) {
    return async (req, res, next) => {
      const controller = new this(req, res, next);

      if (typeof controller[methodName] !== "function") {
        return controller.#pageNotFound(methodName);
      }

      try {
        if (typeof controller.before === "function") {
          const output = await controller.before(methodName);
          if (output === false) return;
        }

        await controller[methodName]();

        if (typeof controller.after === "function") {
          const output = await controller.after(methodName);
          if (output === false) return;
        }

        if (!controller.#rendered && !res.headersSent) {
          controller.#autoRender(methodName);
        }
      } catch (err) {
        next(err);
      }
    };
  }

  // ============================================================================
  // BEFORE / AFTER HOOKS
  // ============================================================================
  async before() {}
  async after() {}

  // ============================================================================
  // CRUD DEFAULTS (404 unless overridden)
  // ============================================================================
  async index() {
    this.#pageNotFound("index");
  }
  async show() {
    this.#pageNotFound("show");
  }
  async new() {
    this.#pageNotFound("new");
  }
  async create() {
    this.#pageNotFound("create");
  }
  async edit() {
    this.#pageNotFound("edit");
  }
  async update() {
    this.#pageNotFound("update");
  }
  async destroy() {
    this.#pageNotFound("destroy");
  }

  // ============================================================================
  // RENDERING HELPERS
  // ============================================================================
  render(view, data = {}) {
    this.#rendered = true;
    return this.response.render(view, data);
  }

  json(data, status = 200) {
    this.#rendered = true;
    return this.response.status(status).json(data);
  }

  send(text, status = 200) {
    this.#rendered = true;
    return this.response.status(status).send(text);
  }

  redirect(location) {
    this.#rendered = true;
    return this.response.redirect(
      location === "back" ? this.#fallbackBackURL() : location
    );
  }

  #autoRender(action) {
    const controllerFolder = this.constructor.name
      .replace(/Controller$/, "")
      .toLowerCase();
    const view = `${controllerFolder}/${action}`;
    return this.response.render(view, this.response.locals);
  }

  // ============================================================================
  // SESSION + FLASH
  // ============================================================================
  get session() {
    return this.request.session || null;
  }

  flash(key, value = null) {
    if (!this.session) return;

    if (!this.session.flash) this.session.flash = {};

    if (value === null) {
      const msg = this.session.flash[key];
      delete this.session.flash[key];
      return msg;
    }

    this.session.flash[key] = value;
  }

  old(field, fallback = "") {
    const old = this.response.locals.flash?.old;
    if (!old || old[field] === undefined) return fallback;
    return old[field];
  }

  #fallbackBackURL() {
    return this.request.get("Referrer") || "/";
  }

  verifyInput(data) {
    return this.verify(data);
  }

  validationFailed(verifyResult, redirectTo = "back") {
    const errors = verifyResult.errors || [];

    if (this.session) {
      this.flash("errors", errors);
      this.flash("old", this.request.body || {});
    }

    if (this.isAjax() || this.wantsJSON()) {
      return this.json({ ok: false, errors }, 422);
    }

    return this.redirect(redirectTo);
  }

  // ============================================================================
  // MODE DETECTION
  // ============================================================================
  isAjax() {
    return this.request.xhr;
  }

  wantsJSON() {
    const accept = this.request.headers.accept || "";
    return accept.includes("application/json");
  }

  // ============================================================================
  // REQUEST HELPERS
  // ============================================================================
  get request() {
    return this.#req;
  }
  get response() {
    return this.#res;
  }
  get next() {
    return this.#next;
  }

  param(name) {
    return this.request.params[name];
  }
  query(name) {
    return this.request.query[name];
  }
  body(name) {
    return this.request.body?.[name];
  }

  // ============================================================================
  // INTERNAL 404
  // ============================================================================
  #pageNotFound(method) {
    return this.response
      .status(404)
      .send(`"${method}" not implemented on ${this.constructor.name}`);
  }
}
