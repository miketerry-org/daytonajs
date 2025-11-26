// home-controller.js
import BaseController from "./base-controller.js";

export default class HomeController extends BaseController {
  // ==========================================================================
  // Base route for the controller
  // ==========================================================================
  static route() {
    return "/";
  }

  // ==========================================================================
  // Register routes with Express router
  // ==========================================================================
  static routes(router) {
    // Simple GET pages
    router.get("/", this.action("index"));
    router.get("/about", this.action("about"));

    // Contact form
    router.get("/contact", this.action("contactForm"));
    router.post("/contact", this.action("submitContact"));

    // Support form
    router.get("/support", this.action("supportForm"));
    router.post("/support", this.action("submitSupport"));
  }

  // ==========================================================================
  // GET /
  // ==========================================================================
  async index() {
    return this.render("home");
  }

  // ==========================================================================
  // GET /about
  // ==========================================================================
  async about() {
    return this.render("about");
  }

  // ==========================================================================
  // GET /contact - show contact form
  // ==========================================================================
  async contactForm() {
    return this.render("contact");
  }

  // ==========================================================================
  // POST /contact - process contact form
  // ==========================================================================
  async submitContact() {
    const data = this.request.body;

    // Example: basic validation using verify()
    const v = this.verifyInput(data)
      .isString("name", true, 2, 50)
      .isEmail("email", true)
      .isString("message", true, 10, 1000);

    if (!v.ok) return this.validationFailed(v);

    // TODO: implement saving / emailing / etc.
    this.flash("success", "Contact form submitted successfully!");
    return this.redirect("/contact");
  }

  // ==========================================================================
  // GET /support - show support form
  // ==========================================================================
  async supportForm() {
    return this.render("support");
  }

  // ==========================================================================
  // POST /support - process support form
  // ==========================================================================
  async submitSupport() {
    const data = this.request.body;

    // Example: basic validation using verify()
    const v = this.verifyInput(data)
      .isString("subject", true, 5, 100)
      .isString("description", true, 10, 2000)
      .isEmail("email", true);

    if (!v.ok) return this.validationFailed(v);

    // TODO: implement saving / emailing / ticket creation, etc.
    this.flash("success", "Support request submitted successfully!");
    return this.redirect("/support");
  }
}
