// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    gsmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GSM",
      required: [true, "GSM is required"],
      index: true,
    },
    qualityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quality",
      required: [true, "Quality is required"],
      index: true,
    },
    productCode: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    hsnCode: {
      type: String,
      required: [true, "HSN code is required"],
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    defaultLengthMeters: {
      type: Number,
      required: [true, "Default length is required"],
      default: 1000,
      enum: [1000, 1500, 2000], // Can have custom lengths too
    },
    productAlias: {
      type: String,
      required: false, // Will be auto-generated
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique combination of categoryId + gsmId + qualityId
productSchema.index({ categoryId: 1, gsmId: 1, qualityId: 1 }, { unique: true });

// Auto-generate productAlias: gsm.name + category.name
// Auto-generate productCode: gsm.name + quality.name + category.name
productSchema.pre("save", async function (next) {
  // Generate/regenerate if productAlias is not set or if gsmId/categoryId changed
  const shouldRegenerateAlias = 
    !this.productAlias || 
    this.isModified("gsmId") || 
    this.isModified("categoryId");
  
  // Generate/regenerate productCode if not set or if gsmId/qualityId/categoryId changed
  const shouldRegenerateCode = 
    !this.productCode || 
    this.isModified("gsmId") || 
    this.isModified("qualityId") ||
    this.isModified("categoryId");
  
  if ((shouldRegenerateAlias || shouldRegenerateCode) && this.gsmId && this.categoryId) {
    try {
      const Category = mongoose.model("Category");
      const GSM = mongoose.model("GSM");
      const Quality = mongoose.model("Quality");
      
      let category = this.categoryId;
      let categoryName = null;
      
      // Check if categoryId is populated (has name property) or just an ObjectId
      if (category && category.name) {
        // Already populated with category document
        categoryName = category.name;
      } else {
        // categoryId is an ObjectId, need to fetch the category
        const fetchedCategory = await Category.findById(this.categoryId);
        if (fetchedCategory && fetchedCategory.name) {
          categoryName = fetchedCategory.name;
        } else {
          return next(new Error("Category not found"));
        }
      }
      
      // Fetch GSM
      let gsm = this.gsmId;
      let gsmName = null;
      if (gsm && gsm.name) {
        // Already populated
        gsmName = gsm.name;
      } else {
        const fetchedGSM = await GSM.findById(this.gsmId);
        if (fetchedGSM && fetchedGSM.name) {
          gsmName = fetchedGSM.name;
        } else {
          return next(new Error("GSM not found"));
        }
      }
      
      // Fetch Quality for productCode
      let qualityName = null;
      if (shouldRegenerateCode) {
        let quality = this.qualityId;
        if (quality && quality.name) {
          // Already populated
          qualityName = quality.name;
        } else {
          const fetchedQuality = await Quality.findById(this.qualityId);
          if (fetchedQuality && fetchedQuality.name) {
            qualityName = fetchedQuality.name;
          } else {
            return next(new Error("Quality not found"));
          }
        }
      }
      
      // Generate productAlias
      if (shouldRegenerateAlias && categoryName && gsmName) {
        this.productAlias = `${gsmName} ${categoryName}`;
      }
      
      // Generate productCode: gsm + quality + category
      if (shouldRegenerateCode && categoryName && gsmName && qualityName) {
        this.productCode = `${gsmName} ${qualityName} ${categoryName}`;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual to populate category via categoryId
productSchema.virtual("category", {
  ref: "Category",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate GSM via gsmId
productSchema.virtual("gsm", {
  ref: "GSM",
  localField: "gsmId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate Quality via qualityId
productSchema.virtual("quality", {
  ref: "Quality",
  localField: "qualityId",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("Product", productSchema);
