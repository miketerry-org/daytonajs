// send-json-helper.js

export default function sendJSONHelper(req, res, next) {
  res.sendJSON = (code, data = {}, errors = []) => {
    const ok = code >= 200 && code <= 299;
    return res.status(code).json({ ok, data, errors });
  };
  next();
}
