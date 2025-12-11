class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleAsyncErrors = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError("Validation Error", 400, "VALIDATION_ERROR");
};

const handleDuplicateKeyError = (err) => {
  const keyValue = err.keyValue || {};
  const field = Object.keys(keyValue)[0] || "value";
  const value = keyValue[field];
  const message = value
    ? `Duplicate value for ${field}: ${value}`
    : "Duplicate value found";
  return new AppError(message, 400, "DUPLICATE_ENTRY");
};

const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, "INVALID_ID");
};

module.exports = {
  AppError,
  handleAsyncErrors,
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
};
