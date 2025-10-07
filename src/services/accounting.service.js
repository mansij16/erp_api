// Basic accounting helper to create voucher lines for SI/PI flows
// Assumes ledgers for Inventory, AR, Sales, OutputGST, InputGST exist.
// Includes helper to post double-entry vouchers and update ledger balances.
const Voucher = require("../models/Voucher");
const Ledger = require("../models/Ledger");

async function postVoucher({ type, lines, date = new Date(), narration = "" }) {
  // validate debits == credits
  const sumDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const sumCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.round(sumDebit * 100) !== Math.round(sumCredit * 100)) {
    throw new Error(
      `Voucher not balanced: debit=${sumDebit} credit=${sumCredit}`
    );
  }

  // create voucher
  const v = await Voucher.create({
    type,
    lines,
    date,
    narration,
    status: "Posted",
  });

  // update ledger balances (simple approach)
  for (const l of lines) {
    const ledger = await Ledger.findById(l.ledger_id);
    if (!ledger) continue;
    // treat Assets/Expenses increase as debit; Liabilities/Income increase as credit
    // But to keep simple: ledger.balance += debit - credit
    const delta = (l.debit || 0) - (l.credit || 0);
    ledger.balance = (ledger.balance || 0) + delta;
    await ledger.save();
  }

  return v;
}

module.exports = { postVoucher };
