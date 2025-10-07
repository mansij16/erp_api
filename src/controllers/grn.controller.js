const GRN = require("../models/GRN");
const PO = require("../models/PO");
const Roll = require("../models/Roll");
const Batch = require("../models/Batch");
const AuditLog = require("../models/AuditLog");
const Product = require("../models/Product");
const SKU = require("../models/SKU");
const { Types } = require("mongoose");
const { generateGRNNumber, generateBatchCode } = require("../utils/generators");
const moment = require("moment-timezone");

/**
 * Validate GRN data
 * @param {Object} data - GRN data to validate
 * @returns {Array} Array of validation errors, empty if valid
 */
const validateGRNData = (data) => {
  const errors = [];
  
  if (!data.po_id) errors.push("PO ID is required");
  if (!data.grn_date) errors.push("GRN date is required");
  if (!data.received_by) errors.push("Received by is required");
  if (!data.warehouse_id) errors.push("Warehouse ID is required");
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("At least one item is required");
  } else {
    data.items.forEach((item, index) => {
      const itemNum = index + 1;
      if (!item.po_line_id) errors.push(`Item ${itemNum}: PO line ID is required`);
      if (!item.sku_id) errors.push(`Item ${itemNum}: SKU ID is required`);
      if (!item.qty_ordered) errors.push(`Item ${itemNum}: Quantity ordered is required`);
      if (!item.qty_received || item.qty_received <= 0) {
        errors.push(`Item ${itemNum}: Valid quantity received is required`);
      }
      if (item.qty_rejected && item.qty_rejected > item.qty_received) {
        errors.push(`Item ${itemNum}: Rejected quantity cannot exceed received quantity`);
      }
      if (!item.unit_price || item.unit_price < 0) {
        errors.push(`Item ${itemNum}: Valid unit price is required`);
      }
      if (!item.tax_rate) item.tax_rate = 0; // Default tax rate to 0 if not provided
    });
  }
  
  return errors;
};

/**
 * Calculate GRN item totals
 * @param {Array} items - GRN items
 * @returns {Object} Calculated totals
 */
const calculateGRNTotals = (items) => {
  let subtotal = 0;
  let tax_total = 0;
  let total = 0;
  
  items.forEach(item => {
    const itemTotal = item.qty_received * item.unit_price;
    const itemTax = itemTotal * (item.tax_rate / 100);
    
    subtotal += itemTotal;
    tax_total += itemTax;
    total += itemTotal + itemTax;
  });
  
  return { subtotal, tax_total, total };
};

/**
 * Create a new Goods Receipt Note (GRN)
 * @route POST /api/grn
 * @access private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createGRN = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const grnData = req.body;
    const errors = validateGRNData(grnData);
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Check if PO exists and is in a valid state
    const po = await PO.findById(grnData.po_id)
      .populate('items.product_id', 'name sku_code')
      .populate('items.sku_id', 'name code')
      .session(session);
      
    if (!po) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        error: "Purchase Order not found" 
      });
    }
    
    // Validate PO status
    if (po.status === "cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        error: "Cannot create GRN for cancelled PO" 
      });
    }
    
    if (po.status === "completed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        error: "Cannot create GRN for completed PO" 
      });
    }
    
    // Validate items against PO
    const itemValidation = await validateGRNItems(grnData.items, po, session);
    if (!itemValidation.valid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        error: "Invalid GRN items",
        details: itemValidation.errors
      });
    }
    
    // Generate GRN number
    const grnNumber = await generateGRNNumber();
    
    // Calculate totals
    const { subtotal, tax_total, total } = calculateGRNTotals(grnData.items);
    
    // Create GRN
    const grn = new GRN({
      ...grnData,
      grn_no: grnNumber,
      po_number: po.po_no,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      status: "draft",
      subtotal,
      tax_total,
      total,
      created_by: req.user._id,
      updated_by: req.user._id,
    });
    
    await grn.save({ session });
    
    // Update PO status and received quantities
    await updatePOQuantities(po, grnData.items, session);
    
    // Create inventory transactions for each item
    await createInventoryTransactions(grn, session);
    
    // Log the action
    await logGRNAction({
      action: "CREATE_GRN",
      grn,
      user: req.user,
      req,
      session,
      oldValue: null,
      metadata: { 
        po_id: po._id,
        po_number: po.po_no,
        supplier_id: po.supplier_id,
        supplier_name: po.supplier_name
      }
    });
    
    await session.commitTransaction();
    session.endSession();
    
    const populatedGRN = await GRN.findById(grn._id)
      .populate('items.product_id', 'name sku_code')
      .populate('items.sku_id', 'name code')
      .populate('warehouse_id', 'name code')
      .populate('received_by', 'name email')
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedGRN,
      message: "GRN created successfully"
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating GRN:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "A GRN with similar details already exists",
        details: error.keyValue
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
    res.status(500).json({ error: "Failed to create GRN" });
  }
};

// List all GRNs with filters
exports.listGRNs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      po_id, 
      supplier_id, 
      start_date, 
      end_date,
      search
    } = req.query;
    
    const skip = (page - 1) * limit;
    const query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (po_id) query.po_id = po_id;
    if (supplier_id) query.supplier_id = supplier_id;
    
    // Date range filter
    if (start_date || end_date) {
      query.grn_date = {};
      if (start_date) query.grn_date.$gte = new Date(start_date);
      if (end_date) {
        const endOfDay = new Date(end_date);
        endOfDay.setHours(23, 59, 59, 999);
        query.grn_date.$lte = endOfDay;
      }
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { grn_no: { $regex: search, $options: "i" } },
        { "supplier.name": { $regex: search, $options: "i" } },
        { "supplier.code": { $regex: search, $options: "i" } },
        { "created_by.name": { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ];
    }
    
    // Get total count for pagination
    const total = await GRN.countDocuments(query);
    
    // Get paginated results with related data
    const grns = await GRN.find(query)
      .populate("po_id", "po_no order_date status")
      .populate("supplier_id", "name code")
      .populate("created_by updated_by", "name email")
      .sort({ grn_date: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      data: grns,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error listing GRNs:", error);
    res.status(500).json({ error: "Failed to fetch GRNs" });
  }
};

// Get a single GRN by ID
exports.getGRN = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    const grn = await GRN.findById(id)
      .populate("po_id", "po_no order_date status")
      .populate("supplier_id", "name code gstin address")
      .populate("created_by updated_by", "name email");
    
    if (!grn) {
      return res.status(404).json({ error: "GRN not found" });
    }
    
    res.json(grn);
  } catch (error) {
    console.error("Error fetching GRN:", error);
    res.status(500).json({ error: "Failed to fetch GRN" });
  }
};

// Update a GRN
exports.updateGRN = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    // Get the current GRN for validation
    const currentGRN = await GRN.findById(id).session(session);
    
    if (!currentGRN) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "GRN not found" });
    }
    
    // Validate if GRN can be updated
    if (["approved", "rejected", "closed"].includes(currentGRN.status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: `Cannot update GRN with status: ${currentGRN.status}` 
      });
    }
    
    // Save old values for audit log
    const oldGRN = currentGRN.toObject();
    
    // Update GRN
    const updatedGRN = await GRN.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updated_by: req.user._id,
        updated_at: new Date()
      },
      { new: true, session, runValidators: true }
    );
    
    // Log the action
    await AuditLog.create([{
      action: "UPDATE_GRN",
      entity: "GRN",
      entity_id: updatedGRN._id,
      performed_by: req.user._id,
      old_value: oldGRN,
      new_value: updatedGRN.toObject(),
      metadata: { 
        ip: req.ip, 
        user_agent: req.get("user-agent") 
      }
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json(updatedGRN);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating GRN:", error);
    res.status(500).json({ error: "Failed to update GRN" });
  }
};

// Approve a GRN
exports.approveGRN = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    // Get the current GRN
    const grn = await GRN.findById(id).session(session);
    
    if (!grn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "GRN not found" });
    }
    
    // Validate if GRN can be approved
    if (grn.status !== "draft" && grn.status !== "pending_approval") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: `Cannot approve GRN with status: ${grn.status}` 
      });
    }
    
    // Save old status for audit log
    const oldStatus = grn.status;
    
    // Update GRN status
    grn.status = "approved";
    grn.approved_by = req.user._id;
    grn.approved_at = new Date();
    grn.updated_by = req.user._id;
    grn.notes = notes || grn.notes;
    
    await grn.save({ session });
    
    // Update PO status if all items received
    await updatePOStatusIfComplete(grn.po_id, session);
    
    // Log the action
    await AuditLog.create([{
      action: "APPROVE_GRN",
      entity: "GRN",
      entity_id: grn._id,
      performed_by: req.user._id,
      old_value: { status: oldStatus },
      new_value: { 
        status: grn.status,
        approved_by: grn.approved_by,
        approved_at: grn.approved_at
      },
      notes,
      metadata: { 
        po_id: grn.po_id,
        ip: req.ip, 
        user_agent: req.get("user-agent") 
      }
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json(grn);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error approving GRN:", error);
    res.status(500).json({ error: "Failed to approve GRN" });
  }
};

// Reject a GRN
exports.rejectGRN = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    if (!reason) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Rejection reason is required" });
    }
    
    // Get the current GRN
    const grn = await GRN.findById(id).session(session);
    
    if (!grn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "GRN not found" });
    }
    
    // Validate if GRN can be rejected
    if (grn.status === "rejected" || grn.status === "closed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: `Cannot reject GRN with status: ${grn.status}` 
      });
    }
    
    // Save old status for audit log
    const oldStatus = grn.status;
    
    // Update GRN status
    grn.status = "rejected";
    grn.rejection_reason = reason;
    grn.rejected_by = req.user._id;
    grn.rejected_at = new Date();
    grn.updated_by = req.user._id;
    grn.notes = notes || grn.notes;
    
    await grn.save({ session });
    
    // Log the action
    await AuditLog.create([{
      action: "REJECT_GRN",
      entity: "GRN",
      entity_id: grn._id,
      performed_by: req.user._id,
      old_value: { status: oldStatus },
      new_value: { 
        status: grn.status,
        rejection_reason: grn.rejection_reason,
        rejected_by: grn.rejected_by,
        rejected_at: grn.rejected_at
      },
      notes,
      metadata: { 
        po_id: grn.po_id,
        ip: req.ip, 
        user_agent: req.get("user-agent") 
      }
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json(grn);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error rejecting GRN:", error);
    res.status(500).json({ error: "Failed to reject GRN" });
  }
};

// Receive rolls for a GRN
exports.receiveRolls = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { rolls, batch_info } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    if (!Array.isArray(rolls) || rolls.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "At least one roll is required" });
    }
    
    // Get the GRN with PO details
    const grn = await GRN.findById(id)
      .populate("po_id", "po_no supplier_id status")
      .session(session);
    
    if (!grn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "GRN not found" });
    }
    
    // Validate GRN status
    if (grn.status !== "approved") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: `Cannot receive rolls for GRN with status: ${grn.status}` 
      });
    }
    
    // Create batch if batch_info is provided
    let batchId = null;
    if (batch_info) {
      const batch = new Batch({
        ...batch_info,
        grn_id: grn._id,
        po_id: grn.po_id._id,
        supplier_id: grn.po_id.supplier_id,
        created_by: req.user._id,
        updated_by: req.user._id
      });
      
      await batch.save({ session });
      batchId = batch._id;
      
      // Log batch creation
      await AuditLog.create([{
        action: "CREATE_BATCH",
        entity: "Batch",
        entity_id: batch._id,
        performed_by: req.user._id,
        old_value: null,
        new_value: batch.toObject(),
        metadata: { 
          grn_id: grn._id,
          po_id: grn.po_id._id,
          ip: req.ip, 
          user_agent: req.get("user-agent") 
        }
      }], { session });
    }
    
    // Create rolls
    const createdRolls = [];
    for (const rollData of rolls) {
      // Validate roll data
      if (!rollData.sku_id || !rollData.length_m || !rollData.width_in) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          error: "Each roll must have sku_id, length_m, and width_in" 
        });
      }
      
      const roll = new Roll({
        ...rollData,
        grn_id: grn._id,
        po_id: grn.po_id._id,
        batch_id: batchId,
        supplier_id: grn.po_id.supplier_id,
        status: "received",
        received_at: new Date(),
        received_by: req.user._id,
        created_by: req.user._id,
        updated_by: req.user._id
      });
      
      await roll.save({ session });
      createdRolls.push(roll);
      
      // Log roll creation
      await AuditLog.create([{
        action: "CREATE_ROLL",
        entity: "Roll",
        entity_id: roll._id,
        performed_by: req.user._id,
        old_value: null,
        new_value: roll.toObject(),
        metadata: { 
          grn_id: grn._id,
          po_id: grn.po_id._id,
          batch_id: batchId,
          ip: req.ip, 
          user_agent: req.get("user-agent") 
        }
      }], { session });
    }
    
    // Update GRN status to "received" if not already
    if (grn.status !== "received") {
      const oldStatus = grn.status;
      grn.status = "received";
      grn.received_at = new Date();
      grn.updated_by = req.user._id;
      
      await grn.save({ session });
      
      // Log status update
      await AuditLog.create([{
        action: "UPDATE_GRN_STATUS",
        entity: "GRN",
        entity_id: grn._id,
        performed_by: req.user._id,
        old_value: { status: oldStatus },
        new_value: { 
          status: grn.status,
          received_at: grn.received_at
        },
        metadata: { 
          po_id: grn.po_id._id,
          ip: req.ip, 
          user_agent: req.get("user-agent") 
        }
      }], { session });
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      message: `${createdRolls.length} rolls received successfully`,
      batch_id: batchId,
      roll_count: createdRolls.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error receiving rolls:", error);
    res.status(500).json({ error: "Failed to receive rolls" });
  }
};

// Record quality check for a GRN
exports.recordQualityCheck = async (req, res) => {
  const session = await GRN.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { 
      roll_id, 
      passed, 
      defects = [], 
      notes, 
      inspected_by, 
      inspected_at = new Date() 
    } = req.body;
    
    if (!Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid GRN ID" });
    }
    
    if (!roll_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Roll ID is required" });
    }
    
    // Get the roll
    const roll = await Roll.findById(roll_id).session(session);
    
    if (!roll) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Roll not found" });
    }
    
    // Validate that roll belongs to this GRN
    if (roll.grn_id.toString() !== id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Roll does not belong to this GRN" });
    }
    
    // Save old status for audit log
    const oldStatus = roll.status;
    
    // Update roll status based on quality check
    roll.status = passed ? "passed_quality_check" : "failed_quality_check";
    roll.quality_checked_at = inspected_at || new Date();
    roll.quality_checked_by = inspected_by || req.user._id;
    roll.quality_notes = notes || roll.quality_notes;
    roll.defects = defects;
    roll.updated_by = req.user._id;
    
    await roll.save({ session });
    
    // Log the quality check
    await AuditLog.create([{
      action: passed ? "PASS_QUALITY_CHECK" : "FAIL_QUALITY_CHECK",
      entity: "Roll",
      entity_id: roll._id,
      performed_by: req.user._id,
      old_value: { status: oldStatus },
      new_value: { 
        status: roll.status,
        quality_checked_at: roll.quality_checked_at,
        quality_checked_by: roll.quality_checked_by,
        defects: roll.defects
      },
      notes,
      metadata: { 
        grn_id: id,
        po_id: roll.po_id,
        batch_id: roll.batch_id,
        ip: req.ip, 
        user_agent: req.get("user-agent") 
      }
    }], { session });
    
    // Check if all rolls in the GRN have been quality checked
    const pendingRolls = await Roll.countDocuments({
      grn_id: id,
      status: { $nin: ["passed_quality_check", "failed_quality_check"] }
    }).session(session);
    
    // If all rolls are checked, update GRN status
    if (pendingRolls === 0) {
      const grn = await GRN.findById(id).session(session);
      if (grn && grn.status === "received") {
        grn.status = "quality_checked";
        grn.updated_by = req.user._id;
        await grn.save({ session });
        
        // Log GRN status update
        await AuditLog.create([{
          action: "UPDATE_GRN_STATUS",
          entity: "GRN",
          entity_id: grn._id,
          performed_by: req.user._id,
          old_value: { status: "received" },
          new_value: { status: "quality_checked" },
          notes: "All rolls quality checked",
          metadata: { 
            po_id: grn.po_id,
            ip: req.ip, 
            user_agent: req.get("user-agent") 
          }
        }], { session });
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      message: `Roll ${passed ? 'passed' : 'failed'} quality check`,
      roll_id: roll._id,
      status: roll.status
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error recording quality check:", error);
    res.status(500).json({ error: "Failed to record quality check" });
  }
};

// Get all rolls for a GRN
exports.getGRNRolls = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      batch_id, 
      sku_id, 
      quality_status,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const skip = (page - 1) * limit;
    const query = { grn_id: id };
    
    // Apply filters
    if (status) query.status = status;
    if (batch_id) query.batch_id = batch_id;
    if (sku_id) query.sku_id = sku_id;
    if (quality_status) {
      query.status = quality_status === 'passed' ? 'passed_quality_check' : 
                    quality_status === 'failed' ? 'failed_quality_check' :
                    quality_status;
    }
    
    // Get total count for pagination
    const total = await Roll.countDocuments(query);
    
    // Get paginated results with related data
    const rolls = await Roll.find(query)
      .populate("sku_id", "gsm quality_name width_in")
      .populate("batch_id", "batch_code")
      .populate("received_by quality_checked_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      data: rolls,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching GRN rolls:", error);
    res.status(500).json({ error: "Failed to fetch GRN rolls" });
  }
};

// Helper function to update PO status if all items are received
async function updatePOStatusIfComplete(poId, session) {
  try {
    const po = await PO.findById(poId).session(session);
    if (!po) return;
    
    // Check if all PO lines are fully received
    const allLinesComplete = po.lines.every(line => {
      return line.qty_ordered <= (line.qty_received || 0);
    });
    
    if (allLinesComplete && po.status !== 'completed') {
      po.status = 'completed';
      po.completed_at = new Date();
      await po.save({ session });
      
      // Log PO completion
      await AuditLog.create([{
        action: "COMPLETE_PO",
        entity: "PO",
        entity_id: po._id,
        performed_by: po.updated_by,
        old_value: { status: 'in_progress' },
        new_value: { 
          status: 'completed',
          completed_at: po.completed_at
        },
        metadata: { 
          po_number: po.po_no,
          supplier_id: po.supplier_id
        }
      }], { session });
    }
  } catch (error) {
    console.error("Error updating PO status:", error);
    throw error;
  }
}