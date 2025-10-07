const moment = require("moment");
const crypto = require("crypto");

const makeBarcode = ({ supplierCode, batchCode, rollId }) => {
  // PRD: Format YYMM-SUP-BATCH-SEQ-CHECK
  const yyMM = moment().format("YYMM");
  const sup = (supplierCode || "SUP").toString().slice(0, 6).toUpperCase();
  const batch = (batchCode || "BATCH").toString().slice(0, 10).toUpperCase();
  const seq = rollId.toString().slice(-6);
  const checksum = crypto
    .createHash("md5")
    .update(`${yyMM}${sup}${batch}${seq}`)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
  return `${yyMM}-${sup}-${batch}-${seq}-${checksum}`;
};

const makeQRPayload = ({ roll }) => {
  // Minimal payload per PRD
  return {
    roll_id: roll._id.toString(),
    sku_id: roll.sku_id ? roll.sku_id.toString() : null,
    batch_id: roll.batch_id.toString(),
    vendor_id: roll.vendor_id.toString(),
    width_in: roll.width_in,
    length_m: roll.length_m,
    landed_cost: roll.landed_cost,
  };
};

module.exports = { makeBarcode, makeQRPayload };
