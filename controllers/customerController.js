const Customer = require("../models/Customer");
const SalesInvoice = require("../models/SalesInvoice");
const SalesOrder = require("../models/SalesOrder");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all customers
const getCustomers = handleAsyncErrors(async (req, res) => {
  const { active, groups, isBlocked } = req.query;
  const filter = {};

  if (active !== undefined) filter.active = active === "true";
  if (groups) filter.groups = { $in: groups.split(",") };
  if (isBlocked !== undefined) filter.isBlocked = isBlocked === "true";

  const customers = await Customer.find(filter).sort({ name: 1 });

  res.json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

// Get single customer
const getCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: customer,
  });
});

// Create customer
const createCustomer = handleAsyncErrors(async (req, res) => {
  const {
    name,
    state,
    address,
    groups,
    contactPersons,
    referralSource,
    creditPolicy,
    baseRate44,
  } = req.body;

  // Generate customer code
  const lastCustomer = await Customer.findOne().sort({ customerCode: -1 });
  let sequence = 1;
  if (lastCustomer) {
    const lastSequence = parseInt(lastCustomer.customerCode.split("-")[1]);
    sequence = lastSequence + 1;
  }
  const customerCode = numberingService.generateCustomerCode(sequence);

  const customer = await Customer.create({
    customerCode,
    name,
    state,
    address,
    groups,
    contactPersons,
    referralSource,
    creditPolicy,
    baseRate44,
  });

  res.status(201).json({
    success: true,
    data: customer,
  });
});

// Update customer
const updateCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

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
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (!customer.creditPolicy.autoBlock) {
    return res.json({
      success: true,
      data: {
        blocked: false,
        reason: "Auto-blocking disabled",
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

  customer.isBlocked = true;
  customer.blockReason = reason;
  customer.blockedAt = new Date();
  await customer.save();

  res.json({
    success: true,
    data: customer,
  });
});

// Unblock customer
const unblockCustomer = handleAsyncErrors(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  customer.isBlocked = false;
  customer.blockReason = null;
  customer.blockedAt = null;
  await customer.save();

  res.json({
    success: true,
    data: customer,
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
};
