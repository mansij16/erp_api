const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Category = require("../models/Category");
const Product = require("../models/Product");
const SKU = require("../models/SKU");
const Supplier = require("../models/Supplier");
const Customer = require("../models/Customer");
const Ledger = require("../models/Ledger");

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb+srv://root:root@aimarketingcluster.irykf5p.mongodb.net/?retryWrites=true&w=majority&appName=AIMarketingCluster"
    );
    console.log("Connected to MongoDB");

    // Drop problematic compound index if it exists
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('skus');
      const indexes = await collection.indexes();

      const compoundIndexName = 'productId_1_widthInches_1';
      const indexExists = indexes.some(idx => idx.name === compoundIndexName);

      if (indexExists) {
        await collection.dropIndex(compoundIndexName);
        console.log('Dropped problematic compound index');
      }
    } catch (error) {
      console.log('No problematic index found or error dropping:', error.message);
    }

    // Clear existing data (with error handling for existing data)
    try {
      await Category.deleteMany({});
      await Product.deleteMany({});
      await SKU.deleteMany({});
      await Supplier.deleteMany({});
      await Customer.deleteMany({});
      await Ledger.deleteMany({});
      console.log("Existing data cleared");
    } catch (error) {
      console.log("Error clearing data (may not exist yet):", error.message);
    }

    // Seed Categories
    const categories = await Category.insertMany([
      { name: "Sublimation", hsnCode: "4809", active: true },
      { name: "Butter", hsnCode: "4806", active: true },
    ]);
    console.log("Categories seeded");

    // Seed Products
    const products = [];
    for (const category of categories) {
      for (const gsm of [30, 35, 45, 55, 65, 80]) {
        for (const quality of ["Premium", "Standard", "Economy"]) {
          products.push({
            categoryId: category._id,
            categoryName: category.name,
            gsm,
            qualityName: quality,
            qualityAliases: [],
            hsnCode: category.hsnCode,
            active: true,
          });
        }
      }
    }

    const insertedProducts = await Product.insertMany(products);
    console.log("Products seeded");

    // Seed SKUs
    const skus = [];
    for (const product of insertedProducts) {
      for (const width of [24, 36, 44, 63]) {
        for (const length of [1000, 1500, 2000]) {
          const cat = product.categoryName === "Sublimation" ? "SUB" : "BTR";
          const quality = product.qualityName.substring(0, 4).toUpperCase();
          skus.push({
            productId: product._id,
            categoryName: product.categoryName,
            gsm: product.gsm,
            qualityName: product.qualityName,
            widthInches: width,
            defaultLengthMeters: length,
            taxRate: 18,
            skuCode: `${cat}-${product.gsm}-${quality}-${width}-${length}`,
            active: true,
          });
        }
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
        const existingSkuCodes = await SKU.distinct('skuCode');
        const newSkus = skus.filter(sku => !existingSkuCodes.includes(sku.skuCode));

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

    // Seed Suppliers with duplicate handling
    try {
      await Supplier.insertMany([
        {
          supplierCode: "SUP-0001",
          name: "Gujarat Paper Mills",
          state: "Gujarat",
          address: "Ring Road, Surat - 395002",
          contactPersons: [
            {
              name: "Ramesh Patel",
              phone: "9876543210",
              email: "ramesh@gujaratpaper.com",
              isPrimary: true,
            },
          ],
          active: true,
        },
        {
          supplierCode: "SUP-0002",
          name: "Premium Imports Trading",
          state: "Gujarat",
          address: "Udhna, Surat - 394210",
          contactPersons: [
            {
              name: "Suresh Shah",
              phone: "9876543211",
              email: "suresh@premiumimports.com",
              isPrimary: true,
            },
          ],
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

    // Seed Customers with duplicate handling
    try {
      await Customer.insertMany([
        {
          customerCode: "CUST-0001",
          name: "ABC Printers",
          state: "Gujarat",
          address: "Varachha, Surat - 395006",
          groups: ["Wholesale"],
          contactPersons: [
            {
              name: "Amit Kumar",
              phones: ["9876543220"],
              email: "amit@abcprinters.com",
              isPrimary: true,
            },
          ],
          creditPolicy: {
            creditLimit: 500000,
            creditDays: 30,
            graceDays: 7,
            autoBlock: true,
            blockRule: "BOTH",
          },
          baseRate44: 120,
          active: true,
        },
        {
          customerCode: "CUST-0002",
          name: "XYZ Digital Solutions",
          state: "Gujarat",
          address: "Katargam, Surat - 395004",
          groups: ["Cash"],
          contactPersons: [
            {
              name: "Priya Sharma",
              phones: ["9876543221"],
              email: "priya@xyzdigital.com",
              isPrimary: true,
            },
          ],
          creditPolicy: {
            creditLimit: 0,
            creditDays: 0,
            graceDays: 0,
            autoBlock: false,
            blockRule: "BOTH",
          },
          baseRate44: 125,
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
