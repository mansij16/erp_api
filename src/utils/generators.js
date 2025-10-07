const { Types } = require("mongoose");
const Counter = require("../models/Counter");

/**
 * Generate a unique document number with prefix and sequence
 * @param {string} prefix - The prefix for the document number (e.g., "GRN", "PO")
 * @param {number} length - The length of the sequence number (default: 6)
 * @returns {Promise<string>} - The generated document number
 */
async function generateDocumentNumber(prefix, length = 6) {
  if (!prefix) {
    throw new Error("Prefix is required");
  }

  // Format the current date as YYMMDD
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find or create counter for the prefix and date
  const counterName = `${prefix}_${dateStr}`;
  
  // Use findOneAndUpdate with upsert to atomically increment the counter
  const result = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true 
    }
  );

  // Generate the sequence number with leading zeros
  const seq = String(result.seq).padStart(length, '0');
  
  // Format: PREFIX-YYMMDD-XXXXXX
  return `${prefix}-${dateStr}-${seq}`;
}

/**
 * Generate a GRN (Goods Receipt Note) number
 * @returns {Promise<string>} - The generated GRN number
 */
async function generateGRNNumber() {
  return generateDocumentNumber("GRN");
}

/**
 * Generate a PO (Purchase Order) number
 * @returns {Promise<string>} - The generated PO number
 */
async function generatePONumber() {
  return generateDocumentNumber("PO");
}

/**
 * Generate a SO (Sales Order) number
 * @returns {Promise<string>} - The generated SO number
 */
async function generateSONumber() {
  return generateDocumentNumber("SO");
}

/**
 * Generate a SI (Sales Invoice) number
 * @returns {Promise<string>} - The generated SI number
 */
async function generateSINumber() {
  return generateDocumentNumber("INV");
}

/**
 * Generate a batch code
 * @param {string} skuCode - The SKU code
 * @param {Date} [date] - Optional date to use (defaults to current date)
 * @returns {string} - The generated batch code
 */
function generateBatchCode(skuCode, date = new Date()) {
  if (!skuCode) {
    throw new Error("SKU code is required");
  }
  
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(100 + Math.random() * 900); // 3 random digits
  
  return `${skuCode}-${year}${month}${day}-${random}`;
}

module.exports = {
  generateDocumentNumber,
  generateGRNNumber,
  generatePONumber,
  generateSONumber,
  generateSINumber,
  generateBatchCode
};
