const Supplier = require("../models/Supplier");
const AuditLog = require("../models/AuditLog");
const { Types } = require("mongoose");

// Create a new supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;
    
    // Validate required fields
    if (!supplierData.name || !supplierData.contact_phone) {
      return res.status(400).json({ error: "Name and contact phone are required" });
    }

    // Create supplier
    const supplier = new Supplier({
      ...supplierData,
      created_by: req.user._id,
      updated_by: req.user._id
    });

    await supplier.save();

    // Log the action
    await AuditLog.create({
      action: "CREATE_SUPPLIER",
      entity: "Supplier",
      entity_id: supplier._id,
      performed_by: req.user._id,
      old_value: null,
      new_value: supplier.toObject(),
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
};

// List all suppliers with pagination and search
exports.listSuppliers = async (req, res) => {
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
        { contact_person: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    // Get total count for pagination
    const total = await Supplier.countDocuments(query);
    
    // Get paginated results
    const suppliers = await Supplier.find(query)
      .select("-__v")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      data: suppliers,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error listing suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
};

// Get a single supplier by ID
exports.getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }
    
    const supplier = await Supplier.findById(id)
      .select("-__v")
      .populate("created_by updated_by", "name email");
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
};

// Update a supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }
    
    // Get the current supplier data for audit log
    const oldSupplier = await Supplier.findById(id);
    
    if (!oldSupplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    // Update supplier
    const supplier = await Supplier.findByIdAndUpdate(
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
      action: "UPDATE_SUPPLIER",
      entity: "Supplier",
      entity_id: supplier._id,
      performed_by: req.user._id,
      old_value: oldSupplier.toObject(),
      new_value: supplier.toObject(),
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
};

// Delete a supplier (soft delete)
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    // Check if supplier has any transactions
    // This would need to be implemented based on your PO/GRN models
    // const hasTransactions = await PO.exists({ supplier_id: id });
    // if (hasTransactions) {
    //   return res.status(400).json({ error: "Cannot delete supplier with existing transactions" });
    // }
    
    // Soft delete
    supplier.status = "inactive";
    supplier.updated_by = req.user._id;
    supplier.updated_at = new Date();
    
    await supplier.save();
    
    // Log the action
    await AuditLog.create({
      action: "DELETE_SUPPLIER",
      entity: "Supplier",
      entity_id: supplier._id,
      performed_by: req.user._id,
      old_value: supplier.toObject(),
      new_value: null,
      metadata: { ip: req.ip, user_agent: req.get("user-agent") }
    });
    
    res.json({ message: "Supplier deactivated successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
};

// Get supplier performance metrics
exports.getSupplierPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }
    
    // Check if supplier exists
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    // This is a simplified example - you would need to implement the actual performance metrics
    // based on your business logic and data models
    
    // Example metrics (placeholder implementation)
    const performanceMetrics = {
      total_orders: 0,
      total_amount: 0,
      on_time_delivery_rate: 0,
      quality_rating_avg: 0,
      // Add more metrics as needed
    };
    
    res.json(performanceMetrics);
  } catch (error) {
    console.error("Error fetching supplier performance:", error);
    res.status(500).json({ error: "Failed to fetch supplier performance" });
  }
};

// Get products supplied by a supplier
exports.getSupplierProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }
    
    // Check if supplier exists
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    // This is a simplified example - you would need to implement the actual query
    // to get products supplied by this supplier based on your data models
    
    // Example response (placeholder implementation)
    const products = [];
    
    res.json(products);
  } catch (error) {
    console.error("Error fetching supplier products:", error);
    res.status(500).json({ error: "Failed to fetch supplier products" });
  }
};
