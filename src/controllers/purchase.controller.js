const PO = require("../models/PO");
const PI = require("../models/PI");
const GRN = require("../models/GRN");
const Supplier = require("../models/Supplier");
const AuditLog = require("../models/AuditLog");
const LandedCost = require("../models/LandedCost");
const Roll = require("../models/Roll");
const { makeBarcode, makeQRPayload } = require("../utils/barcode");

// Create PO
exports.createPO = async (req, res) => {
  const payload = req.body;
  // basic validation
  if (!payload.po_no) return res.status(400).json({ error: "po_no required" });
  const supplier = await Supplier.findById(payload.supplier_id);
  if (!supplier) return res.status(400).json({ error: "supplier not found" });
  const po = await PO.create(payload);
  await AuditLog.create({
    user: req.user._id,
    action: "create",
    entity: "PO",
    entity_id: po._id,
    after: po,
  });
  res.status(201).json(po);
};

// Approve PO
exports.approvePO = async (req, res) => {
  const po = await PO.findById(req.params.id);
  if (!po) return res.status(404).json({ error: "PO not found" });
  if (po.status !== "Draft")
    return res.status(400).json({ error: "Only Draft POs can be approved" });
  po.status = "Approved";
  await po.save();
  await AuditLog.create({
    user: req.user._id,
    action: "approve",
    entity: "PO",
    entity_id: po._id,
    before: { status: "Draft" },
    after: { status: "Approved" },
  });
  res.json(po);
};

// Create PI (Purchase Invoice) and optionally allocate landed costs & create rolls for GRN
exports.createPI = async (req, res) => {
  // payload must contain supplier_id, pi_no, lines[], optional landed_costs[]
  const payload = req.body;
  const { supplier_id, pi_no, lines = [], landed_costs = [], po_id } = payload;
  if (!supplier_id || !pi_no)
    return res.status(400).json({ error: "supplier_id and pi_no required" });
  const supplier = await Supplier.findById(supplier_id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  // compute subtotal, tax, total
  let subtotal = 0;
  let taxTotal = 0;
  for (const ln of lines) {
    if (!ln.qty || !ln.rate) throw new Error("Line must have qty and rate");
    const lineVal = ln.qty * ln.rate;
    subtotal += lineVal;
    taxTotal +=
      lineVal *
      ((ln.tax_rate || Number(process.env.DEFAULT_TAX_RATE || 18)) / 100);
  }
  const total = subtotal + taxTotal;
  const pi = await PI.create({
    pi_no,
    supplier_id,
    po_id,
    lines,
    subtotal,
    tax: taxTotal,
    total,
  });

  // create landed cost entries if provided
  for (const lc of landed_costs) {
    await LandedCost.create({
      pi_id: pi._id,
      type: lc.type,
      basis: lc.basis,
      amount: lc.amount,
      note: lc.note,
    });
  }

  // Optionally create rolls for GRN from incoming lines (assuming each line maps to qty rolls)
  // We will create Rolls with Unmapped status and auto-barcode
  const createdRolls = [];
  for (const ln of lines) {
    for (let i = 0; i < ln.qty; i++) {
      const roll = await Roll.create({
        sku_id: ln.sku_id || null,
        batch_id: ln.batch_id || null,
        vendor_id: supplier._id,
        width_in: ln.width || 44,
        length_m: ln.length_m || 1000,
        status: ln.sku_id ? "Mapped" : "Unmapped",
      });
      // generate barcode / QR
      const barcode = makeBarcode({
        supplierCode: supplier.name.slice(0, 6).toUpperCase(),
        batchCode: ln.batch_id ? ln.batch_id.toString().slice(0, 6) : "BATCH",
        rollId: roll._id.toString().slice(-6),
      });
      roll.barcode = barcode;
      roll.qr_payload = makeQRPayload({ roll });
      await roll.save();
      createdRolls.push(roll);
    }
  }

  await AuditLog.create({
    user: req.user._id,
    action: "create",
    entity: "PI",
    entity_id: pi._id,
    after: pi,
  });
  res.status(201).json({ pi, createdRolls });
};
