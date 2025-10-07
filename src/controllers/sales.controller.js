const SO = require("../models/SO");
const Customer = require("../models/Customer");
const PartyRate = require("../models/PartyRate");
const AuditLog = require("../models/AuditLog");
const SI = require("../models/SI");
const Roll = require("../models/Roll");
const { postVoucher } = require("../services/accounting.service");

// derived_rate_for_width(W) = base_rate_44 × (W / 44) then round nearest ₹1 (configurable)
const deriveRateForWidth = (baseRate44, width) => {
  const raw = baseRate44 * (width / 44);
  return Math.round(raw); // nearest rupee
};

const computeExposure = async (customer_id) => {
  // exposure = outstanding_AR + pending SO value
  // simple outstanding calculation: sum of SI totals of posted SIs with outstanding > 0
  // For demo purpose we return a simplified number
  const outstandingAggregate = 0; // placeholder - implement AR query
  const pendingSOValue = 0; // placeholder - implement SO query
  return outstandingAggregate + pendingSOValue;
};

exports.createSO = async (req, res) => {
  const payload = req.body;
  if (!payload.so_no || !payload.customer_id || !payload.lines)
    return res
      .status(400)
      .json({ error: "so_no, customer_id, lines required" });
  // compute derived rates using PartyRate or default
  const partyRate = await PartyRate.findOne({
    customer_id: payload.customer_id,
    valid_from: { $lte: new Date() },
  }).sort({ valid_from: -1 });
  const baseRate44 = partyRate
    ? partyRate.base_rate_44
    : payload.base_rate_44 || 0;
  for (const ln of payload.lines) {
    ln.derived_rate_per_roll = deriveRateForWidth(baseRate44, ln.width_in);
  }
  const so = await SO.create(payload);
  await AuditLog.create({
    user: req.user._id,
    action: "create",
    entity: "SO",
    entity_id: so._id,
    after: so,
  });
  res.status(201).json(so);
};

exports.confirmSO = async (req, res) => {
  const so = await SO.findById(req.params.id);
  if (!so) return res.status(404).json({ error: "SO not found" });
  if (so.status !== "Draft")
    return res.status(400).json({ error: "Only Draft can be confirmed" });
  const customer = await Customer.findById(so.customer_id);
  if (!customer) return res.status(400).json({ error: "Customer not found" });
  // Credit check
  if (customer.credit_policy && customer.credit_policy.auto_block) {
    // compute exposure
    const exposure = await computeExposure(customer._id);
    const limit = customer.credit_policy.credit_limit || 0;
    const rule = customer.credit_policy.rule || "BOTH";
    // check over limit
    let block = false;
    if (rule === "OVER_LIMIT" || rule === "BOTH") {
      if (exposure > limit) block = true;
    }
    // check over due - omitted detailed invoice due checks for brevity
    if (block) {
      so.status = "OnHold";
      await so.save();
      await AuditLog.create({
        user: req.user._id,
        action: "credit_block",
        entity: "SO",
        entity_id: so._id,
        reason: "auto-block by credit policy",
      });
      return res.status(200).json({ so, blocked: true });
    }
  }
  so.status = "Confirmed";
  await so.save();
  await AuditLog.create({
    user: req.user._id,
    action: "confirm",
    entity: "SO",
    entity_id: so._id,
  });
  res.json(so);
};

exports.createSI = async (req, res) => {
  // payload: so_id, dc_id, lines with roll_id or qty
  const payload = req.body;
  if (!payload.si_no || !payload.lines || !payload.so_id)
    return res.status(400).json({ error: "si_no, so_id, lines required" });
  // compute totals, taxes, discounts
  let subtotal = 0;
  let tax = 0;
  for (const ln of payload.lines) {
    const lineVal = ln.rate_per_roll * (ln.qty_rolls || 1);
    const lineTax =
      (lineVal - (ln.discount_line || 0)) *
      ((ln.tax_rate || Number(process.env.DEFAULT_TAX_RATE || 18)) / 100);
    subtotal += lineVal;
    tax += lineTax;
    ln.line_total =
      Math.round((lineVal - (ln.discount_line || 0) + lineTax) * 100) / 100;
  }
  const total = subtotal + tax - (payload.discount_total || 0);
  const si = await SI.create({ ...payload, subtotal, tax_amount: tax, total });

  // Post accounting voucher (Sales Invoice)
  // Map ledger names to ids (assume ledger existence)
  // For demo, user must create ledgers: AR, Sales, Output GST, COGS, Inventory
  // I will query by name
  const Ledger = require("../models/Ledger");
  const AR = await Ledger.findOne({ name: "Accounts Receivable" });
  const Sales = await Ledger.findOne({ name: "Sales" });
  const OutputGST = await Ledger.findOne({ name: "Output GST" });
  const COGS = await Ledger.findOne({ name: "COGS" });
  const Inventory = await Ledger.findOne({ name: "Inventory" });

  if (!AR || !Sales || !OutputGST || !COGS || !Inventory) {
    // If ledgers not present, do not post; return created SI with warning
    await AuditLog.create({
      user: req.user._id,
      action: "create",
      entity: "SI",
      entity_id: si._id,
      after: si,
    });
    return res
      .status(201)
      .json({
        si,
        warning:
          "Missing ledgers for auto-posting; create required ledgers: Accounts Receivable, Sales, Output GST, COGS, Inventory",
      });
  }

  // compute COGS by summing rolls' landed_cost
  let cogsVal = 0;
  for (const ln of payload.lines) {
    if (ln.roll_id) {
      const roll = await Roll.findById(ln.roll_id);
      if (roll) {
        cogsVal += roll.landed_cost || 0;
        // mark roll dispatched and change status
        roll.status = "Dispatched";
        await roll.save();
      }
    }
  }

  const voucherLines = [
    { ledger_id: AR._id, debit: total, credit: 0, ref_entity: si._id },
    { ledger_id: Sales._id, debit: 0, credit: subtotal, ref_entity: si._id },
    { ledger_id: OutputGST._id, debit: 0, credit: tax, ref_entity: si._id },
    { ledger_id: COGS._id, debit: cogsVal, credit: 0, ref_entity: si._id },
    { ledger_id: Inventory._id, debit: 0, credit: cogsVal, ref_entity: si._id },
  ];

  // use accounting service
  const { postVoucher } = require("../services/accounting");
  await postVoucher({
    type: "Sales",
    lines: voucherLines,
    narration: `Sales Invoice ${si.si_no}`,
  });

  si.status = "Posted";
  await si.save();
  await AuditLog.create({
    user: req.user._id,
    action: "post",
    entity: "SI",
    entity_id: si._id,
    after: si,
  });
  res.status(201).json({ si, posted: true });
};
