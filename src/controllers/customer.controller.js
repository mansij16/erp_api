const Customer = require("../models/Customer");
const PartyRate = require("../models/PartyRate");
const AuditLog = require("../models/AuditLog");
const { Types } = require("mongoose");

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    
    // Validate required fields
    if (!customerData.name || !customerData.contact_phone) {
      return res.status(400).json({ error: "Name and contact phone are required" });
    }

    // Create customer
    const customer = new Customer({
      ...customerData,
      created_by: req.user._id,
      updated_by: req.user._id
    });

    await customer.save();

    // Log the action
    await AuditLog.create({
      action: "CREATE_CUSTOMER",
      entity: "Customer",
      entity_id: customer._id,
      performed_by: req.user._id,
      old_value: null,
      new_value: customer.toObject(),
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

// List all customers with pagination and search
exports.listCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contact_phone: { $regex: search, $options: "i" } },
        { gstin: { $regex: search, $options: "i" } },
        { "contact_persons.name": { $regex: search, $options: "i" } },
        { "contact_persons.phone": { $regex: search, $options: "i" } },
        { "contact_persons.email": { $regex: search, $options: "i" } }
      ];
    }
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    // Get total count for pagination
    const total = await Customer.countDocuments(query);
    
    // Get paginated results
    const customers = await Customer.find(query)
      .select("-__v")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      data: customers,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error listing customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

// Get a single customer by ID
exports.getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    const customer = await Customer.findById(id)
      .select("-__v")
      .populate("created_by updated_by", "name email");
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// Update a customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    // Get the current customer data for audit log
    const oldCustomer = await Customer.findById(id);
    
    if (!oldCustomer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Update customer
    const customer = await Customer.findByIdAndUpdate(
      id,
      { 
        ...updateData, 
        updated_by: req.user._id,
        updated_at: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    // Log the action
    await AuditLog.create({
      action: "UPDATE_CUSTOMER",
      entity: "Customer",
      entity_id: customer._id,
      performed_by: req.user._id,
      old_value: oldCustomer.toObject(),
      new_value: customer.toObject(),
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

// Delete a customer (soft delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    const customer = await Customer.findById(id);
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Check if customer has any transactions
    // This would need to be implemented based on your transaction model
    // const hasTransactions = await Transaction.exists({ customer_id: id });
    // if (hasTransactions) {
    //   return res.status(400).json({ error: "Cannot delete customer with existing transactions" });
    // }
    
    // Soft delete
    customer.status = "inactive";
    customer.updated_by = req.user._id;
    customer.updated_at = new Date();
    
    await customer.save();
    
    // Log the action
    await AuditLog.create({
      action: "DELETE_CUSTOMER",
      entity: "Customer",
      entity_id: customer._id,
      performed_by: req.user._id,
      old_value: customer.toObject(),
      new_value: null,
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.json({ message: "Customer deactivated successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
};

// Update customer credit limit
exports.updateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { credit_limit, credit_days, grace_days, notes } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    if (credit_limit === undefined && credit_days === undefined && grace_days === undefined) {
      return res.status(400).json({ error: "No update data provided" });
    }
    
    const customer = await Customer.findById(id);
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Save old values for audit log
    const oldValues = {
      credit_limit: customer.credit_limit,
      credit_days: customer.credit_days,
      grace_days: customer.grace_days
    };
    
    // Update fields if provided
    if (credit_limit !== undefined) customer.credit_limit = credit_limit;
    if (credit_days !== undefined) customer.credit_days = credit_days;
    if (grace_days !== undefined) customer.grace_days = grace_days;
    
    customer.updated_by = req.user._id;
    customer.updated_at = new Date();
    
    await customer.save();
    
    // Log the action
    await AuditLog.create({
      action: "UPDATE_CREDIT_LIMIT",
      entity: "Customer",
      entity_id: customer._id,
      performed_by: req.user._id,
      old_value: oldValues,
      new_value: {
        credit_limit: customer.credit_limit,
        credit_days: customer.credit_days,
        grace_days: customer.grace_days
      },
      notes,
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.json(customer);
  } catch (error) {
    console.error("Error updating credit limit:", error);
    res.status(500).json({ error: "Failed to update credit limit" });
  }
};

// Get customer transactions
exports.getCustomerTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Build query
    const query = { customer_id: id };
    
    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }
    
    // Add type filter (invoice, payment, etc.)
    if (type) {
      query.type = type;
    }
    
    // Get total count for pagination
    // This is a simplified example - you would need to adjust based on your transaction models
    const total = 0; // Placeholder - implement based on your transaction models
    
    // Get paginated results
    // This is a simplified example - you would need to implement the actual query
    const transactions = []; // Placeholder - implement based on your transaction models
    
    res.json({
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    res.status(500).json({ error: "Failed to fetch customer transactions" });
  }
};

// Add customer rate
exports.addCustomerRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku_id, rate_44, valid_from, valid_to, notes } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    if (!sku_id || rate_44 === undefined) {
      return res.status(400).json({ error: "SKU ID and rate are required" });
    }
    
    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Create new party rate
    const partyRate = new PartyRate({
      customer_id: id,
      sku_id,
      rate_44,
      valid_from: valid_from ? new Date(valid_from) : new Date(),
      valid_to: valid_to ? new Date(valid_to) : null,
      created_by: req.user._id,
      updated_by: req.user._id,
      notes
    });
    
    await partyRate.save();
    
    // Log the action
    await AuditLog.create({
      action: "ADD_CUSTOMER_RATE",
      entity: "PartyRate",
      entity_id: partyRate._id,
      performed_by: req.user._id,
      old_value: null,
      new_value: partyRate.toObject(),
      notes,
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.status(201).json(partyRate);
  } catch (error) {
    console.error("Error adding customer rate:", error);
    res.status(500).json({ error: "Failed to add customer rate" });
  }
};

// Get customer rates
exports.getCustomerRates = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku_id, activeOnly = true } = req.query;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    
    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Build query
    const query = { customer_id: id };
    
    // Add SKU filter
    if (sku_id) {
      query.sku_id = sku_id;
    }
    
    // Add active filter
    if (activeOnly === 'true') {
      const now = new Date();
      query.$or = [
        { valid_to: null },
        { valid_to: { $gte: now } }
      ];
      query.valid_from = { $lte: now };
    }
    
    // Get rates with SKU details
    const rates = await PartyRate.find(query)
      .populate("sku_id", "gsm quality_name width_in")
      .populate("created_by updated_by", "name email")
      .sort({ valid_from: -1, created_at: -1 });
    
    res.json(rates);
  } catch (error) {
    console.error("Error fetching customer rates:", error);
    res.status(500).json({ error: "Failed to fetch customer rates" });
  }
};
