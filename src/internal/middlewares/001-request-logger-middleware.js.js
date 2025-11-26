// request-logger.js

export default function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  console.info("[request]");
  console.info(`${req.method} ${req.url}`);

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.info(
      `[response] Status: ${res.statusCode} - Duration: ${durationMs.toFixed(
        2
      )} ms`
    );
  });

  next();
}
