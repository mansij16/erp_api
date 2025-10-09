const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getVouchers = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Voucher module - implementation pending",
  });
});

module.exports = {
  getVouchers,
};
