// auth-controller.js

import BaseController from "./base-controller.js";

export default class AuthController extends BaseController {
  // ==========================================================================
  // Route base path
  // ==========================================================================
  static route() {
    return "/auth";
  }

  // ==========================================================================
  // Register routes with Express router
  // ==========================================================================
  static routes(router) {
    router.get("/login", this.action("showLoginForm"));
    router.post("/login", this.action("postLoginForm"));
    router.get("/register", this.action("showRegisterForm"));
    router.post("/register", this.action("postRegisterForm"));
  }

  // ==========================================================================
  // Show login form
  // ==========================================================================
  async showLoginForm() {
    // If user is already logged in, redirect to dashboard
    if (this.session?.user) {
      return this.redirect("/dashboard");
    }

    return this.render("auth/login", {
      old: this.old.bind(this),
      flash: this.session?.flash || {},
    });
  }

  // ==========================================================================
  // Handle login form submission (magic link)
  // ==========================================================================
  async postLoginForm() {
    const data = this.request.body || {};

    // Validate email using this.verify()
    const v = this.verifyInput(data).isEmail("email", true);
    if (!v.ok) {
      return this.validationFailed(v);
    }

    const email = data.email;

    // TODO: generate magic login token & send via email
    console.log(`[Magic Link] Would send login link to: ${email}`);

    // Flash a success message
    if (this.session)
      this.flash("success", "Check your email for the login link.");
    this.flash("old", { email }); // repopulate form if needed

    return this.redirect("/auth/login");
  }

  // ==========================================================================
  // Show registration form
  // ==========================================================================
  async showRegisterForm() {
    // Redirect logged-in users
    if (this.session?.user) {
      return this.redirect("/dashboard");
    }

    return this.render("auth/register", {
      old: this.old.bind(this),
      flash: this.session?.flash || {},
    });
  }

  // ==========================================================================
  // Handle registration submission
  // ==========================================================================
  async postRegisterForm() {
    const data = this.request.body || {};

    // Validate email using this.verify()
    const v = this.verifyInput(data).isEmail("email", true);
    if (!v.ok) return this.validationFailed(v);

    const email = data.email;

    // TODO: register user in database
    console.log(`[Register] Would create account for: ${email}`);

    if (this.session) {
      this.flash(
        "success",
        "Account created! Check your email for login link."
      );
      this.flash("old", { email }); // preserve email in form if needed
    }

    return this.redirect("/auth/login");
  }

  // ==========================================================================
  // Optional before hook: redirect already logged-in users
  // ==========================================================================
  async before(action) {
    if (
      [
        "showLoginForm",
        "showRegisterForm",
        "postLoginForm",
        "postRegisterForm",
      ].includes(action)
    ) {
      if (this.session?.user) {
        return this.redirect("/dashboard");
      }
    }
  }
}
