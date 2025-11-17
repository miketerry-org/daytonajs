// base-controller.js:

export default class baseController {
  #request;
  #response;
  #next;

  constructor(req, res, next) {
    this.#request = req;
    this.#response = res;
    this.#next = next;
  }

  static route() {
    throw new Error(
      `"${this.constructor.name}.route" static method must be overridden!`
    );
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

  delete() {
    this.#pageNotFound("delete");
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
    res.status(404).send("Page not found!");
  }
}
