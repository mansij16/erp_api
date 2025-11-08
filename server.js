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
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const skuRoutes = require("./routes/skuRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const rollRoutes = require("./routes/rollRoutes");
const customerRoutes = require("./routes/customerRoutes");
const pricingRoutes = require("./routes/pricingRoutes");

// Import error handler
const globalErrorHandler = require("./middlewares/errorMiddleware");

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors());
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
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/skus", skuRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/rolls", rollRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/pricing", pricingRoutes);

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
    if (process.env.SEED_DB === "true") {
      const seederPath = path.resolve(__dirname, "seeds", "seedMasterData.js");
      console.log("Starting database seeder:", seederPath);
      const child = fork(seederPath, [], { stdio: "inherit" });
      child.on("exit", (code) => {
        if (code === 0) {
          console.log("Database seeding completed successfully.");
        } else {
          console.error("Database seeding failed with code:", code);
        }
      });
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
