const mongoose = require("mongoose");

const skuSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      unique: true,
      required: false, // Will be auto-generated
    },
    skuAlias: {
      type: String,
      required: false,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    widthInches: {
      type: Number,
      required: [true, "Width is required"],
      enum: [24, 36, 44, 63], // Fixed widths as per PRD
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
skuSchema.index({ productId: 1, widthInches: 1 }, { unique: true });
skuSchema.index({ skuCode: 1 });
skuSchema.index({ skuAlias: 1 });
skuSchema.index({ active: 1 });

// Auto-generate skuCode & skuAlias: skuCode = widthInches + productCode, skuAlias = widthInches + productAlias
skuSchema.pre("save", async function (next) {
  const shouldRefreshIdentifiers =
    this.isNew ||
    this.isModified("productId") ||
    this.isModified("widthInches");

  const needsSkuCodeBackfill = !this.skuCode;
  const needsSkuAliasBackfill = !this.skuAlias;

  // Generate when creating/updating identifiers or when either field is missing
  if (
    (shouldRefreshIdentifiers || needsSkuCodeBackfill || needsSkuAliasBackfill) &&
    this.productId &&
    this.widthInches
  ) {
    try {
      const Product = mongoose.model("Product");
      let product = this.productId;

      const productHasRequiredCode =
        product &&
        typeof product === "object" &&
        product.productCode;

      const productHasAlias =
        product &&
        typeof product === "object" &&
        product.productAlias;

      if (
        !productHasRequiredCode ||
        ((shouldRefreshIdentifiers || needsSkuAliasBackfill) && !productHasAlias)
      ) {
        product = await Product.findById(this.productId).select(
          "productCode productAlias"
        );
      }

      if (!product) {
        return next(new Error("Product not found"));
      }

      if (shouldRefreshIdentifiers || needsSkuCodeBackfill) {
        if (!product.productCode) {
          return next(new Error("Product code missing"));
        }
        this.skuCode = `${this.widthInches}-${product.productCode}`;
      }

      if (shouldRefreshIdentifiers || needsSkuAliasBackfill) {
        if (!product.productAlias) {
          return next(new Error("Product alias missing"));
        }
        this.skuAlias = `${this.widthInches}-${product.productAlias}`;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual to populate product details
skuSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("SKU", skuSchema);
