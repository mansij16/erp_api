const Customer = require("../models/Customer");
const SalesInvoice = require("../models/SalesInvoice");
const SalesOrder = require("../models/SalesOrder");
const RateHistory = require("../models/RateHistory");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all customers
const getCustomers = handleAsyncErrors(async (req, res) => {
  const { active, customerGroupId, isBlocked } = req.query;
  const filter = {};

  if (active !== undefined) filter.active = active === "true";
  if (customerGroupId) filter.customerGroupId = customerGroupId;
  if (isBlocked !== undefined)
    filter["creditPolicy.isBlocked"] = isBlocked === "true";

  const customers = await Customer.find(filter)
    .populate("customerGroupId", "name code")
    .sort({ name: 1 });

  res.json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

// Get single customer
const getCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findById(req.params.id).populate(
    "customerGroupId",
    "name code description"
  );

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: customer,
  });
});

// Helper function to sanitize numeric values from formatted strings
const sanitizeNumericValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[₹$€£,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return value;
};

// Helper function to sanitize credit policy
const sanitizeCreditPolicy = (creditPolicy) => {
  if (!creditPolicy) return creditPolicy;
  return {
    ...creditPolicy,
    creditLimit: sanitizeNumericValue(creditPolicy.creditLimit),
    creditDays: typeof creditPolicy.creditDays === 'string' 
      ? parseInt(creditPolicy.creditDays.replace(/[,\s]/g, '')) || 0
      : creditPolicy.creditDays,
    graceDays: typeof creditPolicy.graceDays === 'string'
      ? parseInt(creditPolicy.graceDays.replace(/[,\s]/g, '')) || 0
      : creditPolicy.graceDays,
  };
};

// Create customer
const createCustomer = handleAsyncErrors(async (req, res) => {
  const {
    name,
    state,
    address,
    customerGroupId,
    contactPersons,
    referralSource,
    creditPolicy,
    baseRate44,
    companyName,
    gstin,
    pan,
    businessInfo,
  } = req.body;

  // Sanitize numeric fields
  const sanitizedCreditPolicy = sanitizeCreditPolicy(creditPolicy);
  const sanitizedBaseRate44 = sanitizeNumericValue(baseRate44);
  const sanitizedBusinessInfo = businessInfo ? {
    ...businessInfo,
    targetSalesMeters: sanitizeNumericValue(businessInfo.targetSalesMeters),
  } : businessInfo;

  const customer = await Customer.create({
    name,
    state,
    address,
    companyName,
    gstin,
    pan,
    customerGroupId,
    contactPersons,
    referral: referralSource,
    creditPolicy: sanitizedCreditPolicy,
    baseRate44: sanitizedBaseRate44,
    businessInfo: sanitizedBusinessInfo,
  });

  const populatedCustomer = await Customer.findById(customer._id).populate(
    "customerGroupId",
    "name code"
  );

  res.status(201).json({
    success: true,
    data: populatedCustomer,
  });
});

// Update customer
const updateCustomer = handleAsyncErrors(async (req, res) => {
  // Handle referralSource mapping to referral
  if (req.body.referralSource) {
    req.body.referral = req.body.referralSource;
    delete req.body.referralSource;
  }

  // Sanitize numeric fields before updating
  const updateData = { ...req.body };
  
  if (updateData.creditPolicy) {
    updateData.creditPolicy = sanitizeCreditPolicy(updateData.creditPolicy);
  }
  
  if (updateData.baseRate44 !== undefined) {
    updateData.baseRate44 = sanitizeNumericValue(updateData.baseRate44);
  }
  
  if (updateData.businessInfo) {
    updateData.businessInfo = {
      ...updateData.businessInfo,
      targetSalesMeters: sanitizeNumericValue(updateData.businessInfo.targetSalesMeters),
    };
  }

  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("customerGroupId", "name code");

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: customer,
  });
});

// Check credit (simplified version for now)
const checkCredit = handleAsyncErrors(async (req, res) => {
  const customerId = req.params.id;
  const customer = await Customer.findById(customerId).populate(
    "customerGroupId",
    "name code"
  );

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Check if customer is already blocked
  const isBlocked = customer.creditPolicy?.isBlocked || false;
  const blockReason = customer.creditPolicy?.blockReason || null;

  if (isBlocked) {
    return res.json({
      success: true,
      data: {
        blocked: true,
        reasons: blockReason ? [blockReason] : ["Customer is blocked"],
        exposure: customer.creditPolicy?.currentExposure || 0,
        creditLimit: customer.creditPolicy?.creditLimit || 0,
        outstandingAR: 0, // TODO: Calculate from invoices
        pendingSOValue: 0, // TODO: Calculate from pending orders
      },
    });
  }

  if (!customer.creditPolicy?.autoBlock) {
    return res.json({
      success: true,
      data: {
        blocked: false,
        reason: "Auto-blocking disabled",
        exposure: customer.creditPolicy?.currentExposure || 0,
        creditLimit: customer.creditPolicy?.creditLimit || 0,
        outstandingAR: 0,
        pendingSOValue: 0,
      },
    });
  }

  // For now, return simplified credit check without complex calculations
  // TODO: Implement full credit check logic when SalesInvoice/SalesOrder are fully implemented
  res.json({
    success: true,
    data: {
      blocked: false,
      reason: "Credit check simplified - full implementation pending",
      exposure: customer.creditPolicy?.currentExposure || 0,
      creditLimit: customer.creditPolicy?.creditLimit || 0,
      outstandingAR: 0,
      pendingSOValue: 0,
      note: "This is a placeholder. Full credit checking will be implemented with sales module.",
    },
  });
});

// Block customer
const blockCustomer = handleAsyncErrors(async (req, res) => {
  const { reason } = req.body;

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  customer.creditPolicy.isBlocked = true;
  customer.creditPolicy.blockReason = reason;
  customer.creditPolicy.blockedAt = new Date();
  await customer.save();

  const populatedCustomer = await Customer.findById(customer._id).populate(
    "customerGroupId",
    "name code"
  );

  res.json({
    success: true,
    data: populatedCustomer,
  });
});

// Unblock customer
const unblockCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  customer.creditPolicy.isBlocked = false;
  customer.creditPolicy.blockReason = null;
  customer.creditPolicy.blockedAt = null;
  await customer.save();

  const populatedCustomer = await Customer.findById(customer._id).populate(
    "customerGroupId",
    "name code"
  );

  res.json({
    success: true,
    data: populatedCustomer,
  });
});

// Delete customer
const deleteCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    message: "Customer deleted successfully",
  });
});

// Get rate history for customer
const getRateHistory = handleAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { productId, limit } = req.query;

  const query = { customerId: id };
  if (productId) {
    query.productId = productId;
  }

  const rateHistory = await RateHistory.find(query)
    .populate("productId", "name productCode")
    .populate("soId", "soNumber")
    .populate("siId", "siNumber")
    .populate("overriddenBy", "name")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 50);

  res.json({
    success: true,
    count: rateHistory.length,
    data: rateHistory,
  });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  checkCredit,
  blockCustomer,
  unblockCustomer,
  deleteCustomer,
  getRateHistory,
};
