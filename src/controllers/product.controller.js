const Product = require("../models/Product");
const SKU = require("../models/SKU");
const AuditLog = require("../models/AuditLog");

exports.createProduct = async (req, res) => {
  const payload = req.body;
  const p = await Product.create(payload);
  await AuditLog.create({
    user: req.user._id,
    action: "create",
    entity: "Product",
    entity_id: p._id,
    after: p,
  });
  res.status(201).json(p);
};

exports.listProducts = async (req, res) => {
  const products = await Product.find().lean();
  res.json(products);
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ error: "Not found" });
  const skus = await SKU.find({ product_id: product._id }).lean();
  product.skus = skus;
  res.json(product);
};
