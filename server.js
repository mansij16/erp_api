require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { fork } = require("child_process");

// Import routes
const authRoutes = require("./routes/authRoutes");
const batchRoutes = require("./routes/batchRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const skuRoutes = require("./routes/skuRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const rollRoutes = require("./routes/rollRoutes");
const customerRoutes = require("./routes/customerRoutes");
const customerGroupRoutes = require("./routes/customerGroupRoutes");
const pricingRoutes = require("./routes/pricingRoutes");
const agentRoutes = require("./routes/agentRoutes");
const deliveryChallanRoutes = require("./routes/deliveryChallanRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const purchaseInvoiceRoutes = require("./routes/purchaseInvoiceRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const salesInvoiceRoutes = require("./routes/salesInvoiceRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const reportRoutes = require("./routes/reportRoutes");
const gsmRoutes = require("./routes/gsmRoutes");
const qualityRoutes = require("./routes/qualityRoutes");
const Roll = require("./models/Roll");

// Import error handler
const globalErrorHandler = require("./middlewares/errorMiddleware");

const app = express();

// CORS configuration
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Security middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api", limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/skus", skuRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/rolls", rollRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/customer-groups", customerGroupRoutes);
app.use("/api/v1/pricing", pricingRoutes);
app.use("/api/v1/agents", agentRoutes);
app.use("/api/v1/delivery-challans", deliveryChallanRoutes);
app.use("/api/v1/ledgers", ledgerRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/purchase-orders", purchaseOrderRoutes);
app.use("/api/v1/purchase-invoices", purchaseInvoiceRoutes);
app.use("/api/v1/sales-orders", salesOrderRoutes);
app.use("/api/v1/sales-invoices", salesInvoiceRoutes);
app.use("/api/v1/vouchers", voucherRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/gsms", gsmRoutes);
app.use("/api/v1/qualities", qualityRoutes);

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(globalErrorHandler);

// Database connection
if (!process.env.MONGODB_URI) {
  console.error(
    "MongoDB connection error: MONGODB_URI is not set. Please define it in your environment or .env file."
  );
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
