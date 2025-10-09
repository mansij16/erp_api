const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getPayments = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Payment module - implementation pending",
  });
});

module.exports = {
  getPayments,
};
