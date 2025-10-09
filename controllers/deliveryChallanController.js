const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getDeliveryChallans = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Delivery Challan module - implementation pending",
  });
});

module.exports = {
  getDeliveryChallans,
};
