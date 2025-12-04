const mongoose = require("mongoose");
const Agent = require("../models/Agent");
require("../models/User");
const AppError = require("../utils/AppError");

const COMMISSION_METHODS = {
  PER_METER: "per_meter",
  PERCENTAGE: "percentage",
};

const POPULATE_OPTIONS = [
  { path: "customers", select: "name customerCode phone email" },
  {
    path: "partyCommissions.customer",
    select: "name customerCode phone email",
  },
  { path: "commissionPayouts.customer", select: "name customerCode" },
  { path: "commissionChanges.customer", select: "name customerCode" },
  { path: "commissionChanges.changedBy", select: "name email" },
];

const normalizeCommissionPayload = (commission) => {
  if (!commission) {
    return null;
  }

  const payload = {
    customer: commission.customer,
    commissionType: commission.commissionType,
    amountPerMeter: undefined,
    percentage: undefined,
    applyByDefault:
      commission.applyByDefault === undefined
        ? true
        : Boolean(commission.applyByDefault),
  };

  if (commission.commissionType === COMMISSION_METHODS.PER_METER) {
    payload.amountPerMeter = commission.amountPerMeter;
  } else if (commission.commissionType === COMMISSION_METHODS.PERCENTAGE) {
    payload.percentage = commission.percentage;
  }

  return payload;
};

const buildHistoryRecord = (commission, effectiveFrom, notes) => {
  const timestamp = effectiveFrom ? new Date(effectiveFrom) : new Date();

  return {
    commissionType: commission.commissionType,
    amountPerMeter:
      commission.commissionType === COMMISSION_METHODS.PER_METER
        ? commission.amountPerMeter
        : undefined,
    percentage:
      commission.commissionType === COMMISSION_METHODS.PERCENTAGE
        ? commission.percentage
        : undefined,
    effectiveFrom: timestamp,
    notes,
  };
};

const validateCommissionPayload = (commission) => {
  if (!commission) {
    throw new AppError("Commission payload is required", 400);
  }

  if (!commission.customer) {
    throw new AppError("customer is required for party commission", 400);
  }

  if (!commission.commissionType) {
    throw new AppError("commissionType is required", 400);
  }

  if (
    commission.commissionType !== COMMISSION_METHODS.PER_METER &&
    commission.commissionType !== COMMISSION_METHODS.PERCENTAGE
  ) {
    throw new AppError("Invalid commissionType", 400);
  }

  if (
    commission.commissionType === COMMISSION_METHODS.PER_METER &&
    (commission.amountPerMeter === undefined ||
      commission.amountPerMeter === null)
  ) {
    throw new AppError(
      "amountPerMeter is required for per_meter commission",
      400
    );
  }

  if (
    commission.commissionType === COMMISSION_METHODS.PERCENTAGE &&
    (commission.percentage === undefined || commission.percentage === null)
  ) {
    throw new AppError("percentage is required for percentage commission", 400);
  }
};

const populateAgentQuery = (query) => {
  let populatedQuery = query;
  POPULATE_OPTIONS.forEach((option) => {
    populatedQuery = populatedQuery.populate(option);
  });
  return populatedQuery;
};

const populateAgentDoc = async (doc) => {
  if (!doc) {
    return doc;
  }

  for (const option of POPULATE_OPTIONS) {
    await doc.populate(option);
  }

  return doc;
};

class AgentService {
  async createAgent(data) {
    if (!data.name) {
      throw new AppError("Agent name is required", 400);
    }

    if (!data.state) {
      throw new AppError("Agent state is required", 400);
    }

    if (!data.address || !data.address.line1 || !data.address.city) {
      throw new AppError("Agent address with line1 and city is required", 400);
    }

    if (!data.address.pincode) {
      throw new AppError("Agent pincode is required", 400);
    }

    if (!data.phone) {
      throw new AppError("Agent phone is required", 400);
    }

    const payload = { ...data };

    if (payload.partyCommissions && payload.partyCommissions.length > 0) {
      payload.partyCommissions = payload.partyCommissions.map((commission) => {
        validateCommissionPayload(commission);
        const normalized = normalizeCommissionPayload(commission);
        normalized.history = [
          buildHistoryRecord(
            normalized,
            commission.effectiveFrom,
            commission.notes
          ),
        ];
        return normalized;
      });
    }

    const agent = await Agent.create(payload);
    await populateAgentDoc(agent);
    return agent;
  }

  async getAgents(filters = {}, pagination = {}) {
    const query = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.state) {
      query.state = filters.state;
    }


    if (filters.blockNewSalesForAllParties !== undefined) {
      query.blockNewSalesForAllParties = filters.blockNewSalesForAllParties;
    }

    if (filters.blockNewDeliveriesForAllParties !== undefined) {
      query.blockNewDeliveriesForAllParties =
        filters.blockNewDeliveriesForAllParties;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { agentCode: { $regex: filters.search, $options: "i" } },
        { "address.city": { $regex: filters.search, $options: "i" } },
      ];
    }

    const page = parseInt(pagination.page, 10) || 1;
    const limit = parseInt(pagination.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [agents, total] = await Promise.all([
      populateAgentQuery(
        Agent.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      Agent.countDocuments(query),
    ]);

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAgentById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid agent id", 400);
    }

    const agent = await populateAgentQuery(Agent.findById(id));

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    return agent;
  }

  async getAgentByCode(code) {
    if (!code) {
      throw new AppError("Agent code is required", 400);
    }

    const agent = await populateAgentQuery(
      Agent.findOne({ agentCode: code.toUpperCase() })
    );

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    return agent;
  }

  async updateAgent(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid agent id", 400);
    }

    const immutableFields = ["agentCode", "customers"];
    immutableFields.forEach((field) => delete updateData[field]);

    const agent = await populateAgentQuery(
      Agent.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
    );

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    return agent;
  }

  async toggleAgentStatus(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid agent id", 400);
    }

    const agent = await Agent.findById(id);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    agent.active = !agent.active;
    await agent.save();

    return populateAgentDoc(agent);
  }

  async upsertPartyCommission(agentId, commissionData, options = {}) {
    validateCommissionPayload(commissionData);

    const agent = await Agent.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    const normalized = normalizeCommissionPayload(commissionData);
    const effectiveDate = commissionData.effectiveFrom
      ? new Date(commissionData.effectiveFrom)
      : new Date();

    const existingEntry = agent.partyCommissions.find(
      (entry) =>
        entry.customer &&
        entry.customer.toString() === commissionData.customer.toString()
    );

    let changeRecord = null;

    if (existingEntry) {
      changeRecord = {
        customer: existingEntry.customer,
        changedBy: options.changedBy,
        previousCommissionType: existingEntry.commissionType,
        newCommissionType: normalized.commissionType,
        previousAmountPerMeter: existingEntry.amountPerMeter,
        newAmountPerMeter: normalized.amountPerMeter,
        previousPercentage: existingEntry.percentage,
        newPercentage: normalized.percentage,
        notes: commissionData.notes,
      };

      if (existingEntry.history && existingEntry.history.length > 0) {
        const latestHistory =
          existingEntry.history[existingEntry.history.length - 1];
        if (!latestHistory.effectiveTo) {
          latestHistory.effectiveTo = effectiveDate;
        }
      }

      existingEntry.commissionType = normalized.commissionType;
      existingEntry.amountPerMeter = normalized.amountPerMeter;
      existingEntry.percentage = normalized.percentage;
      existingEntry.applyByDefault = normalized.applyByDefault;

      existingEntry.history =
        existingEntry.history || [];
      existingEntry.history.push(
        buildHistoryRecord(normalized, effectiveDate, commissionData.notes)
      );
    } else {
      const historyRecord = buildHistoryRecord(
        normalized,
        effectiveDate,
        commissionData.notes
      );
      normalized.history = [historyRecord];
      agent.partyCommissions.push(normalized);

      changeRecord = {
        customer: commissionData.customer,
        changedBy: options.changedBy,
        newCommissionType: normalized.commissionType,
        newAmountPerMeter: normalized.amountPerMeter,
        newPercentage: normalized.percentage,
        notes: commissionData.notes,
      };
    }

    if (changeRecord) {
      agent.commissionChanges.push(changeRecord);
    }

    agent.markModified("partyCommissions");
    agent.markModified("commissionChanges");

    await agent.save();

    return populateAgentQuery(Agent.findById(agent._id));
  }

  async removePartyCommission(agentId, customerId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError("Invalid agent id", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new AppError("Invalid customer id", 400);
    }

    const agent = await Agent.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    const existingEntry = agent.partyCommissions.find(
      (entry) =>
        entry.customer && entry.customer.toString() === customerId.toString()
    );

    if (!existingEntry) {
      throw new AppError("Party commission not found for the customer", 404);
    }

    agent.partyCommissions = agent.partyCommissions.filter(
      (entry) =>
        entry.customer && entry.customer.toString() !== customerId.toString()
    );

    agent.commissionChanges.push({
      customer: existingEntry.customer,
      changedBy: options.changedBy,
      previousCommissionType: existingEntry.commissionType,
      previousAmountPerMeter: existingEntry.amountPerMeter,
      previousPercentage: existingEntry.percentage,
      notes: options.notes || "Commission mapping removed",
    });

    agent.markModified("partyCommissions");
    agent.markModified("commissionChanges");

    await agent.save();

    return populateAgentQuery(Agent.findById(agent._id));
  }

  async addCommissionPayout(agentId, payoutData) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError("Invalid agent id", 400);
    }

    if (!payoutData || payoutData.amount === undefined) {
      throw new AppError("Payout amount is required", 400);
    }

    const agent = await Agent.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    agent.commissionPayouts.push({
      customer: payoutData.customer,
      reference: payoutData.reference,
      periodStart: payoutData.periodStart,
      periodEnd: payoutData.periodEnd,
      amount: payoutData.amount,
      payoutStatus: payoutData.payoutStatus,
      paidOn: payoutData.paidOn,
      paymentReference: payoutData.paymentReference,
      notes: payoutData.notes,
    });

    agent.markModified("commissionPayouts");

    await agent.save();

    return populateAgentQuery(Agent.findById(agent._id));
  }

  async updateCommissionPayout(agentId, payoutId, updateData = {}) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError("Invalid agent id", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(payoutId)) {
      throw new AppError("Invalid payout id", 400);
    }

    const agent = await Agent.findOne({
      _id: agentId,
      "commissionPayouts.payoutId": payoutId,
    });

    if (!agent) {
      throw new AppError("Commission payout not found", 404);
    }

    const payout = agent.commissionPayouts.find(
      (item) => item.payoutId.toString() === payoutId.toString()
    );

    if (!payout) {
      throw new AppError("Commission payout not found", 404);
    }

    Object.assign(payout, updateData);

    if (updateData.payoutStatus === "paid" && !updateData.paidOn) {
      payout.paidOn = new Date();
    }

    agent.markModified("commissionPayouts");
    await agent.save();

    return populateAgentQuery(Agent.findById(agent._id));
  }

  async addKycDocument(agentId, documentData) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError("Invalid agent id", 400);
    }

    if (!documentData || !documentData.fileName || !documentData.fileUrl) {
      throw new AppError("KYC document fileName and fileUrl are required", 400);
    }

    const agent = await Agent.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    agent.kycDocuments.push({
      documentType: documentData.documentType,
      fileName: documentData.fileName,
      fileUrl: documentData.fileUrl,
      notes: documentData.notes,
    });

    agent.markModified("kycDocuments");
    await agent.save();

    return populateAgentQuery(Agent.findById(agent._id));
  }

  async removeKycDocument(agentId, documentId) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError("Invalid agent id", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new AppError("Invalid document id", 400);
    }

    const agent = await Agent.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    const initialLength = agent.kycDocuments.length;
    agent.kycDocuments = agent.kycDocuments.filter(
      (doc) => doc.documentId.toString() !== documentId.toString()
    );

    if (agent.kycDocuments.length === initialLength) {
      throw new AppError("KYC document not found", 404);
    }

    agent.markModified("kycDocuments");
    await agent.save();

    return populateAgent(Agent.findById(agent._id));
  }
}

module.exports = new AgentService();

