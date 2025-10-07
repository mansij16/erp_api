const Roll = require("../models/Roll");
const SO = require("../models/SO");
const SI = require("../models/SI");
const Voucher = require("../models/Voucher");
const Customer = require("../models/Customer");
const moment = require("moment");

// Helper function to handle date ranges
const getDateRange = (period) => {
  const now = moment();
  switch (period) {
    case 'today':
      return { 
        start: now.startOf('day').toDate(), 
        end: now.endOf('day').toDate() 
      };
    case 'week':
      return { 
        start: now.startOf('week').toDate(), 
        end: now.endOf('week').toDate() 
      };
    case 'month':
      return { 
        start: now.startOf('month').toDate(), 
        end: now.endOf('month').toDate() 
      };
    case 'year':
      return { 
        start: now.startOf('year').toDate(), 
        end: now.endOf('year').toDate() 
      };
    default: // Custom or all time
      return { 
        start: new Date(0), 
        end: new Date() 
      };
  }
};

// Inventory Reports
exports.getStockSummary = async (req, res) => {
  try {
    const { sku_id, batch_id, vendor_id, status } = req.query;
    
    const match = {};
    if (sku_id) match.sku_id = sku_id;
    if (batch_id) match.batch_id = batch_id;
    if (vendor_id) match.vendor_id = vendor_id;
    if (status) match.status = status;

    const stockSummary = await Roll.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            sku_id: "$sku_id",
            batch_id: "$batch_id",
            status: "$status"
          },
          totalRolls: { $sum: 1 },
          totalMeters: { $sum: "$length_m" },
          totalCost: { $sum: "$landed_cost" }
        }
      },
      {
        $lookup: {
          from: "skus",
          localField: "_id.sku_id",
          foreignField: "_id",
          as: "sku"
        }
      },
      { $unwind: "$sku" },
      {
        $project: {
          _id: 0,
          sku_id: "$_id.sku_id",
          sku_name: { $concat: [
            { $toString: "$sku.gsm" }, "gsm ",
            "$sku.quality_name", " ",
            { $toString: "$sku.width_in" }, "\""
          ]},
          batch_id: "$_id.batch_id",
          status: "$_id.status",
          totalRolls: 1,
          totalMeters: 1,
          totalCost: 1,
          avgCostPerMeter: { $divide: ["$totalCost", "$totalMeters"] }
        }
      },
      { $sort: { sku_name: 1, batch_id: 1 } }
    ]);

    res.json({ data: stockSummary });
  } catch (error) {
    console.error("Error in getStockSummary:", error);
    res.status(500).json({ error: "Failed to generate stock summary report" });
  }
};

exports.getBatchAging = async (req, res) => {
  try {
    const { daysThreshold = 180 } = req.query;
    
    const batchAging = await Roll.aggregate([
      {
        $lookup: {
          from: "batches",
          localField: "batch_id",
          foreignField: "_id",
          as: "batch"
        }
      },
      { $unwind: "$batch" },
      {
        $project: {
          _id: 0,
          roll_id: "$_id",
          barcode: 1,
          sku_id: 1,
          batch_id: 1,
          batch_code: "$batch.batch_code",
          batch_date: "$batch.date",
          vendor_id: 1,
          status: 1,
          length_m: 1,
          width_in: 1,
          landed_cost: 1,
          daysInInventory: {
            $dateDiff: {
              startDate: "$batch.date",
              endDate: new Date(),
              unit: "day"
            }
          }
        }
      },
      {
        $match: {
          daysInInventory: { $gte: parseInt(daysThreshold) },
          status: { $in: ["Mapped", "Allocated"] }
        }
      },
      { $sort: { daysInInventory: -1 } }
    ]);

    res.json({ data: batchAging });
  } catch (error) {
    console.error("Error in getBatchAging:", error);
    res.status(500).json({ error: "Failed to generate batch aging report" });
  }
};

// Sales Reports
exports.getCustomerSalesTrends = async (req, res) => {
  try {
    const { customer_id, period = 'month', groupBy = 'month' } = req.query;
    const { start, end } = getDateRange(period);
    
    const match = {
      status: { $in: ["Posted"] },
      date: { $gte: start, $lte: end }
    };
    
    if (customer_id) match.customer_id = customer_id;

    const dateFormat = {
      month: { $dateToString: { format: "%Y-%m", date: "$date" } },
      day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
    }[groupBy] || "%Y-%m";

    const salesTrends = await SI.aggregate([
      { $match: match },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: "$customer" },
      {
        $group: {
          _id: {
            customer_id: "$customer_id",
            customer_name: "$customer.name",
            period: dateFormat
          },
          totalQty: { $sum: "$lines.qty_rolls" },
          totalAmount: { $sum: "$lines.line_total" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          customer_id: "$_id.customer_id",
          customer_name: "$_id.customer_name",
          period: "$_id.period",
          totalQty: 1,
          totalAmount: 1,
          orderCount: 1,
          avgOrderValue: { $divide: ["$totalAmount", "$orderCount"] }
        }
      },
      { $sort: { period: 1, totalAmount: -1 } }
    ]);

    res.json({ data: salesTrends });
  } catch (error) {
    console.error("Error in getCustomerSalesTrends:", error);
    res.status(500).json({ error: "Failed to generate customer sales trends" });
  }
};

exports.getSkuPerformance = async (req, res) => {
  try {
    const { sku_id, period = 'month' } = req.query;
    const { start, end } = getDateRange(period);
    
    const match = {
      status: { $in: ["Posted"] },
      date: { $gte: start, $lte: end }
    };
    
    if (sku_id) match["lines.sku_id"] = sku_id;

    const skuPerformance = await SI.aggregate([
      { $match: { status: { $in: ["Posted"] }, date: { $gte: start, $lte: end } } },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "skus",
          localField: "lines.sku_id",
          foreignField: "_id",
          as: "sku"
        }
      },
      { $unwind: "$sku" },
      {
        $group: {
          _id: {
            sku_id: "$lines.sku_id",
            sku_name: {
              $concat: [
                { $toString: "$sku.gsm" }, "gsm ",
                "$sku.quality_name", " ",
                { $toString: "$sku.width_in" }, "\""
              ]
            }
          },
          totalQtyRolls: { $sum: "$lines.qty_rolls" },
          totalMeters: { $sum: "$lines.billed_length_m" },
          totalAmount: { $sum: "$lines.line_total" },
          avgRatePerMeter: { $avg: { $divide: ["$lines.line_total", "$lines.billed_length_m"] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          sku_id: "$_id.sku_id",
          sku_name: "$_id.sku_name",
          totalQtyRolls: 1,
          totalMeters: 1,
          totalAmount: 1,
          avgRatePerMeter: 1,
          orderCount: 1,
          avgOrderValue: { $divide: ["$totalAmount", "$orderCount"] }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({ data: skuPerformance });
  } catch (error) {
    console.error("Error in getSkuPerformance:", error);
    res.status(500).json({ error: "Failed to generate SKU performance report" });
  }
};

// Accounting Reports
exports.getTrialBalance = async (req, res) => {
  try {
    const { asOf = new Date() } = req.query;
    
    const trialBalance = await Voucher.aggregate([
      { $match: { date: { $lte: new Date(asOf) } } },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "ledgers",
          localField: "lines.ledger_id",
          foreignField: "_id",
          as: "ledger"
        }
      },
      { $unwind: "$ledger" },
      {
        $group: {
          _id: {
            ledger_id: "$ledger._id",
            name: "$ledger.name",
            group: "$ledger.group"
          },
          debit: { $sum: "$lines.debit" },
          credit: { $sum: "$lines.credit" }
        }
      },
      {
        $project: {
          _id: 0,
          ledger_id: "$_id.ledger_id",
          ledger_name: "$_id.name",
          group: "$_id.group",
          debit: 1,
          credit: 1,
          balance: {
            $cond: [
              { $eq: ["$_id.group", "Expenses"] },
              { $subtract: ["$debit", "$credit"] },
              { $subtract: ["$credit", "$debit"] }
            ]
          }
        }
      },
      { $sort: { group: 1, ledger_name: 1 } }
    ]);

    // Calculate totals
    const totals = {
      debit: 0,
      credit: 0,
      balance: 0
    };

    trialBalance.forEach(entry => {
      totals.debit += entry.debit || 0;
      totals.credit += entry.credit || 0;
      totals.balance += entry.balance || 0;
    });

    res.json({ 
      asOf: new Date(asOf),
      data: trialBalance,
      totals
    });
  } catch (error) {
    console.error("Error in getTrialBalance:", error);
    res.status(500).json({ error: "Failed to generate trial balance" });
  }
};

exports.getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate = new Date() } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    
    // Get all income and expense accounts
    const plData = await Voucher.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: new Date(endDate) },
          "ledger.group": { $in: ["Income", "Expenses"] }
        }
      },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "ledgers",
          localField: "lines.ledger_id",
          foreignField: "_id",
          as: "ledger"
        }
      },
      { $unwind: "$ledger" },
      {
        $group: {
          _id: {
            group: "$ledger.group",
            ledger_id: "$ledger._id",
            name: "$ledger.name"
          },
          amount: {
            $sum: {
              $cond: [
                { $eq: ["$ledger.group", "Income"] },
                { $subtract: ["$lines.credit", "$lines.debit"] },
                { $subtract: ["$lines.debit", "$lines.credit"] }
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id.group",
          items: {
            $push: {
              ledger_id: "$_id.ledger_id",
              name: "$_id.name",
              amount: "$amount"
            }
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          items: 1,
          total: 1
        }
      }
    ]);

    // Calculate gross profit, operating profit, net profit
    const income = plData.find(d => d.type === "Income")?.total || 0;
    const cogs = plData.find(d => d.type === "Expenses" && d.items.some(i => i.name === "Cost of Goods Sold"))?.items[0]?.amount || 0;
    const otherExpenses = plData.find(d => d.type === "Expenses" && !d.items.some(i => i.name === "Cost of Goods Sold"))?.total || 0;

    const grossProfit = income - cogs;
    const operatingProfit = grossProfit - otherExpenses;
    const netProfit = operatingProfit; // Assuming no taxes/other income for now

    res.json({
      period: { start, end: new Date(endDate) },
      income: plData.find(d => d.type === "Income") || { items: [], total: 0 },
      expenses: plData.find(d => d.type === "Expenses") || { items: [], total: 0 },
      summary: {
        grossProfit,
        operatingProfit,
        netProfit
      }
    });
  } catch (error) {
    console.error("Error in getProfitAndLoss:", error);
    res.status(500).json({ error: "Failed to generate profit and loss statement" });
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const { asOf = new Date() } = req.query;
    const date = new Date(asOf);
    
    // Get all ledger balances
    const balances = await Voucher.aggregate([
      { $match: { date: { $lte: date } } },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "ledgers",
          localField: "lines.ledger_id",
          foreignField: "_id",
          as: "ledger"
        }
      },
      { $unwind: "$ledger" },
      {
        $group: {
          _id: {
            group: "$ledger.group",
            ledger_id: "$ledger._id",
            name: "$ledger.name"
          },
          balance: {
            $sum: {
              $cond: [
                { $in: ["$ledger.group", ["Assets", "Expenses"]] },
                { $subtract: ["$lines.debit", "$lines.credit"] },
                { $subtract: ["$lines.credit", "$lines.debit"] }
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id.group",
          items: {
            $push: {
              ledger_id: "$_id.ledger_id",
              name: "$_id.name",
              balance: "$balance"
            }
          },
          total: { $sum: "$balance" }
        }
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          items: 1,
          total: 1
        }
      }
    ]);

    // Calculate totals
    const assets = balances.find(b => b.type === "Assets")?.total || 0;
    const liabilities = balances.find(b => b.type === "Liabilities")?.total || 0;
    const equity = balances.find(b => b.type === "Equity")?.total || 0;
    const profit = balances.find(b => b.type === "Income")?.total || 0 
                 - balances.find(b => b.type === "Expenses")?.total || 0;

    res.json({
      asOf: date,
      assets: balances.find(b => b.type === "Assets") || { items: [], total: 0 },
      liabilities: balances.find(b => b.type === "Liabilities") || { items: [], total: 0 },
      equity: balances.find(b => b.type === "Equity") || { items: [], total: 0 },
      profitAndLoss: {
        income: balances.find(b => b.type === "Income")?.total || 0,
        expenses: balances.find(b => b.type === "Expenses")?.total || 0,
        netProfit: profit
      },
      totals: {
        totalAssets: assets,
        totalLiabilities: liabilities,
        totalEquity: equity + profit,
        balanceCheck: (assets - (liabilities + equity + profit)) === 0
      }
    });
  } catch (error) {
    console.error("Error in getBalanceSheet:", error);
    res.status(500).json({ error: "Failed to generate balance sheet" });
  }
};

// Credit Reports
exports.getAgingReport = async (req, res) => {
  try {
    const { asOf = new Date() } = req.query;
    const date = new Date(asOf);
    
    // Get all posted SIs that are not fully paid
    const outstandingInvoices = await SI.aggregate([
      { 
        $match: { 
          status: "Posted",
          $or: [
            { fully_paid: false },
            { fully_paid: { $exists: false } }
          ],
          date: { $lte: date }
        } 
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "invoice_id",
          as: "payments"
        }
      },
      {
        $addFields: {
          total_paid: { $sum: "$payments.amount" },
          balance: { $subtract: ["$total", { $ifNull: [{ $sum: "$payments.amount" }, 0] }] },
          daysOverdue: {
            $dateDiff: {
              startDate: { $add: ["$date", { $multiply: ["$customer.credit_days", 24 * 60 * 60 * 1000] }] },
              endDate: date,
              unit: "day"
            }
          }
        }
      },
      { $match: { balance: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          invoice_id: "$_id",
          invoice_no: "$si_no",
          date: 1,
          customer_id: 1,
          customer_name: "$customer.name",
          total: 1,
          total_paid: 1,
          balance: 1,
          due_date: {
            $dateAdd: {
              startDate: "$date",
              unit: "day",
              amount: "$customer.credit_days"
            }
          },
          daysOverdue: 1,
          aging_bucket: {
            $switch: {
              branches: [
                { case: { $lte: ["$daysOverdue", 0] }, then: "Not Due" },
                { case: { $lte: ["$daysOverdue", 30] }, then: "0-30" },
                { case: { $lte: ["$daysOverdue", 60] }, then: "31-60" },
                { case: { $lte: ["$daysOverdue", 90] }, then: "61-90" },
                { case: { $gt: ["$daysOverdue", 90] }, then: "90+" }
              ],
              default: "Not Due"
            }
          }
        }
      },
      { $sort: { customer_name: 1, due_date: 1 } }
    ]);

    // Group by customer and aging bucket
    const agingSummary = outstandingInvoices.reduce((acc, invoice) => {
      const customerKey = `${invoice.customer_id}-${invoice.customer_name}`;
      if (!acc[customerKey]) {
        acc[customerKey] = {
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          total_outstanding: 0,
          buckets: {
            "Not Due": 0,
            "0-30": 0,
            "31-60": 0,
            "61-90": 0,
            "90+": 0
          },
          invoices: []
        };
      }
      
      acc[customerKey].total_outstanding += invoice.balance;
      acc[customerKey].buckets[invoice.aging_bucket] += invoice.balance;
      acc[customerKey].invoices.push({
        invoice_id: invoice.invoice_id,
        invoice_no: invoice.invoice_no,
        date: invoice.date,
        due_date: invoice.due_date,
        total: invoice.total,
        balance: invoice.balance,
        daysOverdue: invoice.daysOverdue,
        aging_bucket: invoice.aging_bucket
      });
      
      return acc;
    }, {});

    // Convert to array and calculate totals
    const summary = Object.values(agingSummary);
    
    const totals = {
      "Not Due": 0,
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
      total_outstanding: 0
    };
    
    summary.forEach(customer => {
      Object.keys(customer.buckets).forEach(bucket => {
        totals[bucket] += customer.buckets[bucket];
      });
      totals.total_outstanding += customer.total_outstanding;
    });

    res.json({
      asOf: date,
      summary,
      totals,
      total_customers: summary.length
    });
  } catch (error) {
    console.error("Error in getAgingReport:", error);
    res.status(500).json({ error: "Failed to generate aging report" });
  }
};
