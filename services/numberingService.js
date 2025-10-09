const moment = require("moment");

class NumberingService {
  async generateNumber(prefix, model) {
    const yearMonth = moment().format("YYMM");
    const pattern = `${prefix}-${yearMonth}`;

    // Find the last document with this pattern
    const lastDoc = await model
      .findOne({
        [`${prefix.toLowerCase()}Number`]: new RegExp(`^${pattern}`),
      })
      .sort({ [`${prefix.toLowerCase()}Number`]: -1 });

    let sequence = 1;
    if (lastDoc) {
      const lastNumber = lastDoc[`${prefix.toLowerCase()}Number`];
      const lastSequence = parseInt(lastNumber.split("-").pop());
      sequence = lastSequence + 1;
    }

    return `${pattern}-${String(sequence).padStart(4, "0")}`;
  }

  generateSupplierCode(sequence) {
    return `SUP-${String(sequence).padStart(4, "0")}`;
  }

  generateCustomerCode(sequence) {
    return `CUST-${String(sequence).padStart(4, "0")}`;
  }

  generateBatchCode() {
    const yearMonth = moment().format("YYMM");
    const random = Math.floor(Math.random() * 1000);
    return `BATCH-${yearMonth}-${String(random).padStart(3, "0")}`;
  }

  generateRollNumber(supplierCode, batchCode, sequence) {
    const yearMonth = moment().format("YYMM");
    const supCode = supplierCode.split("-")[1];
    const batchNum = batchCode.split("-").pop();
    return `${yearMonth}-${supCode}-${batchNum}-${String(sequence).padStart(
      4,
      "0"
    )}`;
  }
}

module.exports = new NumberingService();
