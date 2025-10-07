require("dotenv").config();
require("express-async-errors"); // auto catches promise rejections in express
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.route");
const productRoutes = require("./routes/products.route");
const purchaseRoutes = require("./routes/purchase.route");
const grnRoutes = require("./routes/grn.route");
const rollRoutes = require("./routes/rolls.route");
const salesRoutes = require("./routes/sales.route");
const accountingRoutes = require("./routes/accounting.route");
const reportsRoutes = require("./routes/reports.route");

// Initialize moment for date handling
const moment = require("moment-timezone");
moment.tz.setDefault(process.env.TZ || "Asia/Kolkata");

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/rolls", rollRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/reports", reportsRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || "ERP" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Server started on port ${PORT}`);
});
