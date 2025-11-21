// base-controller.js

export default class BaseController {
  #request;
  #response;
  #next;

  constructor(req, res, next) {
    this.#request = req;
    this.#response = res;
    this.#next = next;
  }

  static route() {
    throw new Error(`"${this.name}.route" static method must be overridden!`);
  }

  index() {
    this.#pageNotFound("index");
  }

  show() {
    this.#pageNotFound("show");
  }

  new() {
    this.#pageNotFound("new");
  }

  create() {
    this.#pageNotFound("create");
  }

  edit() {
    this.#pageNotFound("edit");
  }

  update() {
    this.#pageNotFound("update");
  }

  destroy() {
    this.#pageNotFound("destroy");
  }

  get request() {
    return this.#request;
  }

  get response() {
    return this.#response;
  }

  get next() {
    return this.#next;
  }

  #pageNotFound(method) {
    this.#response.status(404).send(`"${method}" not implemented.`);
  }
}
