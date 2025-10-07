const Roll = require("../models/Roll");
const SKU = require("../models/SKU");
const AuditLog = require("../models/AuditLog");

exports.listRolls = async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  const rolls = await Roll.find(q).limit(200).lean();
  res.json(rolls);
};

exports.getRoll = async (req, res) => {
  const roll = await Roll.findById(req.params.id)
    .populate("sku_id batch_id vendor_id")
    .lean();
  if (!roll) return res.status(404).json({ error: "Not found" });
  res.json(roll);
};

exports.mapRollToSKU = async (req, res) => {
  const { sku_id, reason } = req.body;
  const roll = await Roll.findById(req.params.id);
  if (!roll) return res.status(404).json({ error: "roll not found" });
  const sku = await SKU.findById(sku_id);
  if (!sku) return res.status(400).json({ error: "sku not found" });
  const before = roll.toObject();
  roll.sku_id = sku._id;
  roll.status = "Mapped";
  await roll.save();
  await AuditLog.create({
    user: req.user._id,
    action: "map",
    entity: "Roll",
    entity_id: roll._id,
    before,
    after: roll.toObject(),
    reason,
  });
  res.json(roll);
};

exports.bulkMap = async (req, res) => {
  // payload: [{ roll_id, sku_id }, ...]
  const pairs = req.body;
  if (!Array.isArray(pairs))
    return res.status(400).json({ error: "Array expected" });
  const results = [];
  for (const p of pairs) {
    const roll = await Roll.findById(p.roll_id);
    if (!roll) {
      results.push({ roll_id: p.roll_id, error: "not found" });
      continue;
    }
    const sku = await SKU.findById(p.sku_id);
    if (!sku) {
      results.push({ roll_id: p.roll_id, error: "sku not found" });
      continue;
    }
    const before = roll.toObject();
    roll.sku_id = sku._id;
    roll.status = "Mapped";
    await roll.save();
    await AuditLog.create({
      user: req.user._id,
      action: "map",
      entity: "Roll",
      entity_id: roll._id,
      before,
      after: roll.toObject(),
    });
    results.push({ roll_id: roll._id, success: true });
  }
  res.json({ results });
};
