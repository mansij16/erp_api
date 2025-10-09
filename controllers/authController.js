const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const login = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    message: "Authentication module - implementation pending",
  });
});

module.exports = {
  login,
};
