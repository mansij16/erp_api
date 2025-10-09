const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getLedgers = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Ledger module - implementation pending",
  });
});

module.exports = {
  getLedgers,
};
