const mongoose = require("mongoose");

const skuSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      unique: true,
      required: false, // Will be auto-generated
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
skuSchema.index({ active: 1 });

// Auto-generate skuCode: productCode-widthInches
skuSchema.pre("save", async function (next) {
  // Only generate if skuCode is not set and we have required fields
  if (!this.skuCode && this.productId && this.widthInches) {
    try {
      const Product = mongoose.model("Product");
      let product = this.productId;
      
      // Check if productId is populated (has productCode property) or just an ObjectId
      if (product && product.productCode) {
        // Already populated with product document
        this.skuCode = `${product.productCode}-${this.widthInches}`;
      } else {
        // productId is an ObjectId, need to fetch the product
        const fetchedProduct = await Product.findById(this.productId);
        if (fetchedProduct && fetchedProduct.productCode) {
          this.skuCode = `${fetchedProduct.productCode}-${this.widthInches}`;
        } else {
          return next(new Error("Product not found or productCode missing"));
        }
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
