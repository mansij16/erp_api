const {
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
} = require("../utils/errorHandler");

const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    error = handleValidationError(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    error = handleCastError(err);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

module.exports = errorMiddleware;
