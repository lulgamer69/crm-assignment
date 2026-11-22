const mongoose = require("mongoose");
const Lead = require("../models/lead");

const ALLOWED_LEAD_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "company",
  "source",
  "status",
  "notes",
]);

const ALLOWED_STATUSES = new Set([
  "New",
  "Contacted",
  "Qualified",
  "Lost",
]);

const INPUT_VALIDATION_ERROR_CODE = "LEAD_INPUT_VALIDATION";
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_SIZE = 100;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createInputValidationError = (message) => {
  const error = new Error(message);
  error.code = INPUT_VALIDATION_ERROR_CODE;
  return error;
};

const normalizePositiveInteger = (value, parameterName, maximum) => {
  const normalizedValue =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (!Number.isSafeInteger(normalizedValue) || normalizedValue <= 0) {
    throw createInputValidationError(
      `${parameterName} must be a positive integer`
    );
  }

  if (maximum !== undefined && normalizedValue > maximum) {
    throw createInputValidationError(
      `${parameterName} cannot exceed ${maximum}`
    );
  }

  return normalizedValue;
};

const pickAllowedLeadFields = (leadData) =>
  Object.fromEntries(
    Object.entries(leadData ?? {}).filter(
      ([field, value]) =>
        ALLOWED_LEAD_FIELDS.has(field) && value !== undefined
    )
  );

const createLead = async (leadData, ownerId) => {
  const lead = await Lead.create({
    ...pickAllowedLeadFields(leadData),
    owner: ownerId,
  });

  return lead;
};

const getAllLeads = async (
  ownerId,
  search,
  status,
  page = 1,
  limit = 10
) => {
  if (search !== undefined && typeof search !== "string") {
    throw createInputValidationError("Search must be a string");
  }

  const normalizedSearch = search ?? "";

  if (normalizedSearch.length > MAX_SEARCH_LENGTH) {
    throw createInputValidationError(
      `Search cannot exceed ${MAX_SEARCH_LENGTH} characters`
    );
  }

  if (
    status !== undefined &&
    status !== null &&
    status !== "" &&
    (typeof status !== "string" || !ALLOWED_STATUSES.has(status))
  ) {
    throw createInputValidationError(
      "Status must be New, Contacted, Qualified, or Lost"
    );
  }

  const normalizedPage = normalizePositiveInteger(page, "page");
  const normalizedLimit = normalizePositiveInteger(
    limit,
    "limit",
    MAX_PAGE_SIZE
  );
  const skip = (normalizedPage - 1) * normalizedLimit;

  if (!Number.isSafeInteger(skip)) {
    throw createInputValidationError(
      "Page and limit produce an excessively large offset"
    );
  }

  const query = { owner: ownerId };

  if (normalizedSearch) {
    const escapedSearch = escapeRegex(normalizedSearch);

    query.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { company: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  if (status !== undefined && status !== null && status !== "") {
    query.status = status;
  }

  const totalLeads = await Lead.countDocuments(query);

  const leads = await Lead.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(normalizedLimit);

  return {
    leads,
    totalLeads,
    totalPages: Math.ceil(totalLeads / normalizedLimit),
  };
};

const updateLead = async (id, leadData, ownerId) => {
  const updates = pickAllowedLeadFields(leadData);

  if (Object.keys(updates).length === 0) {
    throw createInputValidationError(
      "At least one valid field is required to update a lead"
    );
  }

  const updatedLead = await Lead.findOneAndUpdate(
    { _id: id, owner: ownerId },
    updates,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  return updatedLead;
};

const deleteLead = async (id, ownerId) => {
  const deletedLead = await Lead.findOneAndDelete({ _id: id, owner: ownerId });

  return deletedLead;
};

const getLeadStats = async (ownerId) => {
  const stats = await Lead.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(ownerId),
        status: { $in: [...ALLOWED_STATUSES] },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    lost: 0,
  };

  stats.forEach((item) => {
    result.total += item.count;

    switch (item._id) {
      case "New":
        result.new = item.count;
        break;

      case "Contacted":
        result.contacted = item.count;
        break;

      case "Qualified":
        result.qualified = item.count;
        break;

      case "Lost":
        result.lost = item.count;
        break;
    }
  });

  return result;
};

module.exports = {
  INPUT_VALIDATION_ERROR_CODE,
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
};
