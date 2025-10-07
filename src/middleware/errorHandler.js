module.exports = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  console.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  return res
    .status(status)
    .json({ error: message, details: err.details || null });
};
