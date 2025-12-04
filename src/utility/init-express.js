// init-express.js

import system from "../export/system.js";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import session from "express-session";
import fileupload from "express-fileupload";

export default function initExpress() {
  // initialize empty express app
  const app = express();

  // disable the X-Powered-By header
  app.disable("x-powered-by");

  // enable gzip compression
  app.use(compression());

  // security middleware
  app.set("trust proxy", 1);

  const limit = system.config.server.getString("body_limit", "10kb");
  app.use(express.json({ limit }));
  app.use(express.urlencoded({ extended: true, limit }));
  app.use(helmet());
  app.use(hpp());
  app.use(cors({}));

  // cookie parser
  app.use(cookieParser());

  // session support
  const sessionOptions = {
    secret: system.config.server.getString("session_secret"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !system.isDevelopment,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  };
  app.use(session(sessionOptions));

  // request rate limiter
  const rateLimitMinutes = system.config.server.getInteger(
    "rate_limit_minutes",
    1
  );
  const rateLimitRequests = system.config.server.getInteger(
    "rate_limit_requests",
    100
  );

  const limiter = rateLimit({
    windowMs: rateLimitMinutes * 60 * 1000,
    max: rateLimitRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  return app;
}
