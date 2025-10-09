const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const errorMiddleware = require("./middleware/errorMiddleware");
const auditMiddleware = require("./middleware/auditMiddleware");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Audit middleware for all routes
app.use(auditMiddleware);

// Routes
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/categories", require("./routes/categoryRoutes"));
app.use("/api/v1/products", require("./routes/productRoutes"));
app.use("/api/v1/skus", require("./routes/skuRoutes"));
app.use("/api/v1/suppliers", require("./routes/supplierRoutes"));
app.use("/api/v1/customers", require("./routes/customerRoutes"));
app.use("/api/v1/batches", require("./routes/batchRoutes"));
app.use("/api/v1/rolls", require("./routes/rollRoutes"));
app.use("/api/v1/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api/v1/grns", require("./routes/grnRoutes"));
app.use("/api/v1/purchase-invoices", require("./routes/purchaseInvoiceRoutes"));
app.use("/api/v1/sales-orders", require("./routes/salesOrderRoutes"));
app.use("/api/v1/delivery-challans", require("./routes/deliveryChallanRoutes"));
app.use("/api/v1/sales-invoices", require("./routes/salesInvoiceRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));
app.use("/api/v1/ledgers", require("./routes/ledgerRoutes"));
app.use("/api/v1/vouchers", require("./routes/voucherRoutes"));
app.use("/api/v1/reports", require("./routes/reportRoutes"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error middleware (must be last)
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err);
  process.exit(1);
});
