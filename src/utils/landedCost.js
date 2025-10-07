// landedCost allocation handler
// totalCosts: [{type, amount, basis}]  basis: ROLL|METER|VALUE
// rolls: [{_id, length_m, landed_cost (current), base_value (e.g., invoice value per roll)}]
// returns updated per-roll landed allocation amounts and updates DB externally

const allocateLandedCosts = (rolls, totalCosts, basisField = "length_m") => {
  // Compute sum of basis units
  // For each cost, compute allocation per roll using formula:
  // allocation = total_cost * (roll_basis / sum_all_roll_basis)
  const results = {}; // rollId => totalAllocated
  for (const r of rolls) results[r._id.toString()] = 0;

  for (const cost of totalCosts) {
    let sumBasis = 0;
    const basis = cost.basis; // ROLL|METER|VALUE
    const rollBasisValues = {};
    for (const r of rolls) {
      let val = 1;
      if (basis === "ROLL") val = 1;
      else if (basis === "METER") val = r.length_m;
      else if (basis === "VALUE") val = r.base_value || 0;
      rollBasisValues[r._id.toString()] = val;
      sumBasis += val;
    }
    if (sumBasis === 0) continue;
    for (const r of rolls) {
      const pid = r._id.toString();
      const alloc = cost.amount * (rollBasisValues[pid] / sumBasis);
      results[pid] += alloc;
    }
  }

  // return mapping and new landed cost if existing landed_cost present
  const output = rolls.map((r) => {
    const pid = r._id.toString();
    const allocated = results[pid] || 0;
    const newLanded = (r.landed_cost || 0) + allocated;
    return { roll_id: pid, allocated, newLanded };
  });
  return output;
};

module.exports = { allocateLandedCosts };
