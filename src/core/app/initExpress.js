// initExpress.js

// import all necessary modules
import env from "../utility/env.js";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import session from "express-session";

/**
 * Disable X-Powered-By header
 */
function initPoweredBy(app) {
  app.disable("x-powered-by");
}

/**
 * Fast gzip compression
 */
function initCompression(app) {
  app.use(compression());
}

/**
 * Helmet, HPP, JSON, URLENCODED, CORS
 */
function initSecurity(app) {
  const limit = app.config.body_limit || "10kb";

  app.set("trust proxy", 1);
  app.use(express.json({ limit }));
  app.use(express.urlencoded({ extended: true, limit }));
  app.use(helmet());
  app.use(hpp());
  app.use(cors({}));
}

/**
 * Cookies
 */
function initCookieParser(app) {
  app.use(cookieParser());
}

/**
 * Sessions
 */
function initSession(app) {
  const conf = app.config;

  const sessionOptions = {
    secret: conf.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !env.isDevelopment,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  };

  app.use(session(sessionOptions));
}

/**
 * Rate limiting
 */
function initRateLimit(app) {
  const conf = app.config;
  const limiter = rateLimit({
    windowMs: (conf.rate_limit_minutes || 1) * 60 * 1000,
    max: conf.rate_limit_requests || 200,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
}

/**
 * Request logger middleware
 */
function initRequestLogger(app) {
  if (app.middlewares?.requestLogger) {
    app.use(app.middlewares.requestLogger);
  }
}

/**
 * Response logger middleware
 */
function initResponseLogger(app) {
  if (app.middlewares?.responseLogger) {
    app.use(app.middlewares.responseLogger);
  }
}

/**
 * morgan dev logs
 */
function initDevelopmentLogging(app) {
  if (env.isDevelopment) {
    app.use(morgan("dev"));
  }
}

/**
 * Static file serving
 */
function initStaticFiles(app) {
  if (app.config.static_root) {
    app.use(
      express.static(app.config.static_root, {
        maxAge: 31536000000,
        immutable: true,
      })
    );
  }
}

/**
 * res.sendJSON helper
 */
function initSendJSONHelper(app) {
  app.use((req, res, next) => {
    res.sendJSON = data => res.json(data);
    next();
  });
}

/**
 * View engine
 */
function initViewEngine(app) {
  if (app.config.view_engine) {
    app.set("view engine", app.config.view_engine);
  }
}

/**
 * Graceful shutdown
 */
function initShutdown(app) {
  const shutdown = async signal => {
    console.log(`${signal} received: shutting down...`);
    if (typeof app.close === "function") {
      await app.close();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Main initializer
 *
 * @param {object} config - Application config
 * @param {object} system - System flags { isDevelopment: true/false }
 * @param {object} middlewares - Optional middleware bag
 * @param {function} close - Optional closing function
 */
export default function initExpress({ config, system, middlewares, close }) {
  const app = express();

  // attach objects onto app
  app.config = config;
  app.system = system || {};
  app.middlewares = middlewares || {};
  app.close = close;

  // ordered initialization
  initPoweredBy(app);
  initSecurity(app);
  initCompression(app);
  initCookieParser(app);
  initSession(app);
  initRateLimit(app);
  initRequestLogger(app);
  initResponseLogger(app);
  initDevelopmentLogging(app);
  initStaticFiles(app);
  initSendJSONHelper(app);
  initViewEngine(app);
  initShutdown(app);

  return app;
}
