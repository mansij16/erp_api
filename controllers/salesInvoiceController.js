const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getSalesInvoices = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Sales Invoice module - implementation pending",
  });
});

module.exports = {
  getSalesInvoices,
};
