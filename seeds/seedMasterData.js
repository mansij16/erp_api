const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Category = require("../models/Category");
const GSM = require("../models/GSM");
const Quality = require("../models/Quality");
const Product = require("../models/Product");
const SKU = require("../models/SKU");
const Supplier = require("../models/Supplier");
const Customer = require("../models/Customer");
const CustomerRate = require("../models/CustomerRate");
const Ledger = require("../models/Ledger");

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://root:root@aimarketingcluster.irykf5p.mongodb.net/?retryWrites=true&w=majority&appName=AIMarketingCluster"
    );
    console.log("Connected to MongoDB");

    // Drop problematic compound index if it exists
    try {
      const db = mongoose.connection.db;
      const collection = db.collection("skus");
      const indexes = await collection.indexes();

      const compoundIndexName = "productId_1_widthInches_1";
      const indexExists = indexes.some((idx) => idx.name === compoundIndexName);

      if (indexExists) {
        await collection.dropIndex(compoundIndexName);
        console.log("Dropped problematic compound index");
      }
    } catch (error) {
      console.log(
        "No problematic index found or error dropping:",
        error.message
      );
    }

    // Clear existing data (with error handling for existing data)
    try {
      await Category.deleteMany({});
      await GSM.deleteMany({});
      await Quality.deleteMany({});
      await Product.deleteMany({});
      await SKU.deleteMany({});
      await Supplier.deleteMany({});
      await Customer.deleteMany({});
      await Ledger.deleteMany({});
      await CustomerRate.deleteMany({});
      console.log("Existing data cleared");
    } catch (error) {
      console.log("Error clearing data (may not exist yet):", error.message);
    }

    // Seed Categories (align with Category model: name + code + hsnCode)
    const categories = await Category.insertMany([
      { name: "Sublimation", code: "SUB", hsnCode: "4809", active: true },
      { name: "Butter", code: "BTR", hsnCode: "4806", active: true },
    ]);
    console.log("Categories seeded");

    // Seed GSM records
    const gsmRecords = await GSM.insertMany([
      { name: "30 GSM", value: 30, active: true },
      { name: "35 GSM", value: 35, active: true },
      { name: "45 GSM", value: 45, active: true },
      { name: "55 GSM", value: 55, active: true },
      { name: "65 GSM", value: 65, active: true },
      { name: "80 GSM", value: 80, active: true },
    ]);
    console.log("GSM records seeded");

    // Create GSM map for easy lookup
    const gsmMap = new Map(gsmRecords.map((g) => [g.name, g._id]));

    // Seed Quality records
    const qualityRecords = await Quality.insertMany([
      { name: "Premium", active: true },
      { name: "Standard", active: true },
      { name: "Economy", active: true },
    ]);
    console.log("Quality records seeded");

    // Create Quality map for easy lookup
    const qualityMap = new Map(qualityRecords.map((q) => [q.name, q._id]));

    // Seed Products (align with Product model)
    const products = [];
    for (const category of categories) {
      for (const gsmName of ["30 GSM", "35 GSM", "45 GSM", "55 GSM", "65 GSM", "80 GSM"]) {
        for (const qualityName of ["Premium", "Standard", "Economy"]) {
          const gsmId = gsmMap.get(gsmName);
          const qualityId = qualityMap.get(qualityName);
          
          if (!gsmId || !qualityId) {
            console.error(`Missing GSM or Quality for ${gsmName} / ${qualityName}`);
            continue;
          }

          products.push({
            categoryId: category._id,
            gsmId: gsmId,
            qualityId: qualityId,
            hsnCode: category.hsnCode,
            taxRate: 18,
            defaultLengthMeters: 1000, // Required field: enum [1000, 1500, 2000]
            active: true,
          });
        }
      }
    }

    const insertedProducts = await Product.insertMany(products);
    console.log("Products seeded");

    // Seed SKUs
    // Prepare category map for SKU code generation
    const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

    // Populate products with GSM and Quality for SKU code generation
    const populatedProducts = await Product.find({ _id: { $in: insertedProducts.map(p => p._id) } })
      .populate("gsmId")
      .populate("qualityId")
      .populate("categoryId");

    const skus = [];
    for (const product of populatedProducts) {
      const cat = categoryMap.get(String(product.categoryId));
      const catCode = cat?.code || "CAT";
      const gsmName = product.gsmId?.name || "";
      const qualityName = product.qualityId?.name || "";
      const quality = qualityName.substring(0, 4).toUpperCase();
      
      for (const width of [24, 36, 44, 63]) {
        skus.push({
          productId: product._id,
          widthInches: width,
          taxRate: 18,
          skuCode: `${catCode}-${gsmName}-${quality}-${width}-${product.defaultLengthMeters}`,
          active: true,
        });
      }
    }

    // Insert SKUs with duplicate handling
    try {
      const result = await SKU.insertMany(skus, { ordered: false });
      console.log(`${result.length} SKUs seeded`);
    } catch (error) {
      if (error.code === 11000) {
        console.log("Some SKUs already exist, skipping duplicates...");
        // Get existing SKU codes
        const existingSkuCodes = await SKU.distinct("skuCode");
        const newSkus = skus.filter(
          (sku) => !existingSkuCodes.includes(sku.skuCode)
        );

        if (newSkus.length > 0) {
          const result = await SKU.insertMany(newSkus, { ordered: false });
          console.log(`${result.length} new SKUs seeded`);
        } else {
          console.log("All SKUs already exist");
        }
      } else {
        console.error("Unexpected error inserting SKUs:", error.message);
        throw error;
      }
    }

    // Seed Suppliers with duplicate handling (align with Supplier model)
    try {
      await Supplier.insertMany([
        {
          code: "GPM001",
          name: "Gujarat Paper Mills",
          companyName: "Gujarat Paper Mills Pvt Ltd",
          gstin: "24ABCDE1234F1Z5",
          pan: "ABCDE1234F",
          state: "Gujarat",
          stateCode: "GJ",
          address: {
            line1: "Ring Road",
            line2: "",
            city: "Surat",
            pincode: "395002",
          },
          contactPersons: [
            {
              name: "Ramesh Patel",
              designation: "Sales Manager",
              phone: "9876543210",
              email: "ramesh@gujaratpaper.com",
              isPrimary: true,
            },
          ],
          paymentTerms: { creditDays: 30, creditLimit: 1000000 },
          leadTime: 7,
          preferredSupplier: true,
          active: true,
        },
        {
          code: "PIT001",
          name: "Premium Imports Trading",
          companyName: "Premium Imports Trading Co.",
          gstin: "24ABCDE1234F1Z6",
          pan: "ABCDE1234F",
          state: "Gujarat",
          stateCode: "GJ",
          address: {
            line1: "Udhna",
            line2: "",
            city: "Surat",
            pincode: "394210",
          },
          contactPersons: [
            {
              name: "Suresh Shah",
              designation: "Owner",
              phone: "9876543211",
              email: "suresh@premiumimports.com",
              isPrimary: true,
            },
          ],
          paymentTerms: { creditDays: 15, creditLimit: 500000 },
          leadTime: 10,
          preferredSupplier: false,
          active: true,
        },
      ]);
      console.log("Suppliers seeded");
    } catch (error) {
      if (error.code === 11000) {
        console.log("Suppliers already exist, skipping...");
      } else {
        throw error;
      }
    }

    // Seed Customers with duplicate handling (align with Customer model)
    try {
      await Customer.insertMany([
        {
          name: "ABC Printers",
          companyName: "ABC Printers Pvt Ltd",
          state: "Gujarat",
          stateCode: "GJ",
          address: {
            billing: {
              line1: "Varachha",
              line2: "",
              city: "Surat",
              pincode: "395006",
            },
            shipping: [
              {
                label: "Main Warehouse",
                line1: "Varachha",
                city: "Surat",
                pincode: "395006",
                isDefault: true,
              },
            ],
          },
          contactPersons: [
            {
              name: "Amit Kumar",
              designation: "Owner",
              phone: "9876543220",
              email: "amit@abcprinters.com",
              isPrimary: true,
            },
          ],
          group: "Wholesale",
          creditPolicy: {
            creditLimit: 500000,
            creditDays: 30,
            graceDays: 7,
            autoBlock: true,
            blockRule: "BOTH",
          },
          active: true,
        },
        {
          name: "XYZ Digital Solutions",
          companyName: "XYZ Digital Solutions",
          state: "Gujarat",
          stateCode: "GJ",
          address: {
            billing: {
              line1: "Katargam",
              line2: "",
              city: "Surat",
              pincode: "395004",
            },
            shipping: [
              {
                label: "Office",
                line1: "Katargam",
                city: "Surat",
                pincode: "395004",
                isDefault: true,
              },
            ],
          },
          contactPersons: [
            {
              name: "Priya Sharma",
              designation: "Manager",
              phone: "9876543221",
              email: "priya@xyzdigital.com",
              isPrimary: true,
            },
          ],
          group: "Cash",
          creditPolicy: {
            creditLimit: 0,
            creditDays: 0,
            graceDays: 0,
            autoBlock: false,
            blockRule: "BOTH",
          },
          active: true,
        },
      ]);
    console.log("Customers seeded");
    } catch (error) {
      if (error.code === 11000) {
        console.log("Customers already exist, skipping...");
      } else {
        throw error;
      }
    }

    // Seed Customer Rates for each customer-product (for pricing)
    try {
      const customerRates = [];
      const customers = await Customer.find({});
      for (const customer of customers) {
        // Set baseRate44 seed per customer group
        const defaultRate = customer.group === "Wholesale" ? 120 : 125;
        for (const product of insertedProducts) {
          customerRates.push({
            customerId: customer._id,
            productId: product._id,
            baseRate44: defaultRate,
            active: true,
          });
        }
      }

      if (customerRates.length > 0) {
        await CustomerRate.insertMany(customerRates, { ordered: false });
        console.log(`${customerRates.length} customer rates seeded`);
      }
    } catch (error) {
      if (error.code === 11000) {
        console.log("Customer rates already exist, skipping duplicates...");
      } else {
        throw error;
      }
    }

    // Seed System Ledgers with duplicate handling
    try {
      await Ledger.insertMany([
        // Assets
        {
          ledgerCode: "INVENTORY",
          name: "Inventory",
          group: "Assets",
          isSystemLedger: true,
        },
        {
          ledgerCode: "CASH",
          name: "Cash in Hand",
          group: "Assets",
          isSystemLedger: true,
        },
        {
          ledgerCode: "BANK",
          name: "Bank Accounts",
          group: "Assets",
          isSystemLedger: true,
        },
        {
          ledgerCode: "AR",
          name: "Accounts Receivable",
          group: "Assets",
          isSystemLedger: true,
        },
        {
          ledgerCode: "INPUT_TAX",
          name: "Input Tax",
          group: "Assets",
          isSystemLedger: true,
        },

        // Liabilities
        {
          ledgerCode: "AP",
          name: "Accounts Payable",
          group: "Liabilities",
          isSystemLedger: true,
        },
        {
          ledgerCode: "OUTPUT_TAX",
          name: "Output Tax",
          group: "Liabilities",
          isSystemLedger: true,
        },

        // Income
        {
          ledgerCode: "SALES",
          name: "Sales - Domestic",
          group: "Income",
          isSystemLedger: true,
        },
        {
          ledgerCode: "DISC_RCVD",
          name: "Discounts Received",
          group: "Income",
          isSystemLedger: true,
        },

        // Expenses
        {
          ledgerCode: "COGS",
          name: "Cost of Goods Sold",
          group: "Expenses",
          isSystemLedger: true,
        },
        {
          ledgerCode: "FREIGHT",
          name: "Freight Inward",
          group: "Expenses",
          isSystemLedger: true,
        },
        {
          ledgerCode: "CLEARING",
          name: "Clearing & Forwarding",
          group: "Expenses",
          isSystemLedger: true,
        },
        {
          ledgerCode: "DUTY",
          name: "Customs Duty",
          group: "Expenses",
          isSystemLedger: true,
        },
        {
          ledgerCode: "DISC_GIVEN",
          name: "Discounts Allowed",
          group: "Expenses",
          isSystemLedger: true,
        },

        // Equity
        {
          ledgerCode: "CAPITAL",
          name: "Capital Account",
          group: "Equity",
          isSystemLedger: true,
        },
        {
          ledgerCode: "RETAINED",
          name: "Retained Earnings",
          group: "Equity",
          isSystemLedger: true,
        },
      ]);
      console.log("System ledgers seeded");
    } catch (error) {
      if (error.code === 11000) {
        console.log("System ledgers already exist, skipping...");
      } else {
        throw error;
      }
    }

    console.log("Seeding completed successfully");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
