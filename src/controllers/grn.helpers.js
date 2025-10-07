const { Types } = require("mongoose");
const Batch = require("../models/Batch");
const Roll = require("../models/Roll");
const PO = require("../models/PO");
const AuditLog = require("../models/AuditLog");
const { generateBatchCode } = require("../utils/generators");
const moment = require("moment-timezone");

/**
 * Validate GRN items against PO
 * @param {Array} grnItems - GRN items to validate
 * @param {Object} po - Purchase Order document
 * @param {Object} session - MongoDB session
 * @returns {Object} Validation result with status and errors
 */
const validateGRNItems = async (grnItems, po, session) => {
  const errors = [];
  const poItemsMap = new Map();
  
  // Create a map of PO items by line ID for quick lookup
  po.items.forEach(item => {
    poItemsMap.set(item._id.toString(), item);
  });
  
  // Track total received quantities by PO line ID
  const receivedQuantities = new Map();
  
  for (const [index, grnItem] of grnItems.entries()) {
    const itemNum = index + 1;
    const poItem = poItemsMap.get(grnItem.po_line_id);
    
    // Check if PO line exists
    if (!poItem) {
      errors.push(`Item ${itemNum}: Invalid PO line ID`);
      continue;
    }
    
    // Check SKU matches PO
    if (grnItem.sku_id.toString() !== poItem.sku_id.toString()) {
      errors.push(`Item ${itemNum}: SKU does not match PO`);
    }
    
    // Check product matches PO
    if (grnItem.product_id.toString() !== poItem.product_id.toString()) {
      errors.push(`Item ${itemNum}: Product does not match PO`);
    }
    
    // Check received quantity doesn't exceed ordered
    const totalReceived = (receivedQuantities.get(grnItem.po_line_id) || 0) + grnItem.qty_received;
    if (totalReceived > poItem.quantity) {
      errors.push(
        `Item ${itemNum}: Total received quantity (${totalReceived}) exceeds ordered quantity (${poItem.quantity})`
      );
    }
    receivedQuantities.set(grnItem.po_line_id, totalReceived);
    
    // Validate UOM
    if (grnItem.uom !== poItem.uom) {
      errors.push(`Item ${itemNum}: UOM does not match PO`);
    }
    
    // Validate unit price against PO (with tolerance for rounding)
    const priceTolerance = 0.01; // 1% tolerance
    const priceDifference = Math.abs(grnItem.unit_price - poItem.unit_price);
    const maxAllowedDifference = poItem.unit_price * priceTolerance;
    
    if (priceDifference > maxAllowedDifference) {
      errors.push(
        `Item ${itemNum}: Unit price (${grnItem.unit_price}) differs from PO price (${poItem.unit_price}) by more than ${priceTolerance * 100}%`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Update PO quantities based on GRN items
 * @param {Object} po - Purchase Order document
 * @param {Array} grnItems - GRN items
 * @param {Object} session - MongoDB session
 */
const updatePOQuantities = async (po, grnItems, session) => {
  const poItemsMap = new Map(po.items.map(item => [item._id.toString(), item]));
  let allItemsFullyReceived = true;
  
  // Update received quantities in PO
  for (const grnItem of grnItems) {
    const poItem = poItemsMap.get(grnItem.po_line_id);
    if (!poItem) continue;
    
    // Update received quantity
    poItem.qty_received = (poItem.qty_received || 0) + grnItem.qty_received;
    
    // Update rejected quantity if any
    if (grnItem.qty_rejected) {
      poItem.qty_rejected = (poItem.qty_rejected || 0) + grnItem.qty_rejected;
    }
    
    // Check if this line is fully received
    if (poItem.qty_received < poItem.quantity) {
      allItemsFullyReceived = false;
    }
  }
  
  // Update PO status if all items are fully received
  if (allItemsFullyReceived) {
    po.status = 'completed';
  } else if (po.status === 'pending') {
    po.status = 'partially_received';
  }
  
  po.updated_at = new Date();
  await po.save({ session });
};

/**
 * Create inventory transactions for GRN items
 * @param {Object} grn - GRN document
 * @param {Object} session - MongoDB session
 */
const createInventoryTransactions = async (grn, session) => {
  const batchOperations = [];
  const rollOperations = [];
  
  for (const [index, item] of grn.items.entries()) {
    // Skip if no quantity received
    if (!item.qty_received) continue;
    
    // Generate batch code
    const batchCode = generateBatchCode(item.sku_id);
    
    // Create batch
    const batch = new Batch({
      batch_no: batchCode,
      sku_id: item.sku_id,
      product_id: item.product_id,
      grn_id: grn._id,
      po_id: grn.po_id,
      supplier_id: grn.supplier_id,
      warehouse_id: grn.warehouse_id,
      mfg_date: item.mfg_date || grn.grn_date,
      exp_date: item.exp_date || null,
      qty_received: item.qty_received,
      qty_available: item.qty_received - (item.qty_rejected || 0),
      qty_rejected: item.qty_rejected || 0,
      unit_cost: item.unit_price,
      tax_rate: item.tax_rate || 0,
      status: 'in_stock',
      created_by: grn.created_by,
      updated_by: grn.updated_by
    });
    
    // Create rolls for the batch (if applicable)
    if (item.rolls && Array.isArray(item.rolls)) {
      for (const rollData of item.rolls) {
        const roll = new Roll({
          roll_no: rollData.roll_no,
          batch_id: batch._id,
          sku_id: item.sku_id,
          product_id: item.product_id,
          grn_id: grn._id,
          po_id: grn.po_id,
          supplier_id: grn.supplier_id,
          warehouse_id: grn.warehouse_id,
          location_id: grn.warehouse_id, // Default to warehouse location
          width: rollData.width,
          length: rollData.length,
          weight: rollData.weight,
          unit_of_measure: rollData.unit_of_measure || 'meters',
          status: 'in_stock',
          created_by: grn.created_by,
          updated_by: grn.updated_by
        });
        
        rollOperations.push(roll.save({ session }));
        batch.rolls.push(roll._id);
      }
    }
    
    batchOperations.push(batch.save({ session }));
    
    // Update GRN item with batch reference
    item.batch_id = batch._id;
  }
  
  // Execute all batch and roll operations in parallel
  await Promise.all([...batchOperations, ...rollOperations]);
};

/**
 * Log GRN actions to audit log
 * @param {Object} params - Log parameters
 * @param {string} params.action - Action name (e.g., 'CREATE_GRN', 'UPDATE_GRN')
 * @param {Object} params.grn - GRN document
 * @param {Object} params.user - User document
 * @param {Object} params.req - Express request object
 * @param {Object} params.session - MongoDB session
 * @param {Object|null} params.oldValue - Old value before update (for updates)
 * @param {Object} [params.metadata] - Additional metadata
 */
const logGRNAction = async ({
  action,
  grn,
  user,
  req,
  session,
  oldValue,
  metadata = {}
}) => {
  const logEntry = new AuditLog({
    action,
    entity: 'GRN',
    entity_id: grn._id,
    entity_name: grn.grn_no,
    performed_by: user._id,
    old_value: oldValue,
    new_value: grn,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    metadata: {
      grn_no: grn.grn_no,
      po_id: grn.po_id,
      po_number: grn.po_number,
      supplier_id: grn.supplier_id,
      supplier_name: grn.supplier_name,
      ...metadata
    }
  });
  
  return logEntry.save({ session });
};

module.exports = {
  validateGRNItems,
  updatePOQuantities,
  createInventoryTransactions,
  logGRNAction
};
