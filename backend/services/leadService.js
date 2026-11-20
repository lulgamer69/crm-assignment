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

const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_SIZE = 100;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePositiveInteger = (value, parameterName, maximum) => {
  const normalizedValue =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (!Number.isSafeInteger(normalizedValue) || normalizedValue <= 0) {
    throw new Error(`${parameterName} must be a positive integer`);
  }

  if (maximum !== undefined && normalizedValue > maximum) {
    throw new Error(`${parameterName} cannot exceed ${maximum}`);
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

const createLead = async (leadData) => {
  const lead = await Lead.create(pickAllowedLeadFields(leadData));

  return lead;
};

const getAllLeads = async (
  search,
  status,
  page = 1,
  limit = 10
) => {
  if (search !== undefined && typeof search !== "string") {
    throw new Error("Search must be a string");
  }

  const normalizedSearch = search ?? "";

  if (normalizedSearch.length > MAX_SEARCH_LENGTH) {
    throw new Error(`Search cannot exceed ${MAX_SEARCH_LENGTH} characters`);
  }

  if (
    status !== undefined &&
    status !== null &&
    status !== "" &&
    (typeof status !== "string" || !ALLOWED_STATUSES.has(status))
  ) {
    throw new Error("Status must be New, Contacted, Qualified, or Lost");
  }

  const normalizedPage = normalizePositiveInteger(page, "page");
  const normalizedLimit = normalizePositiveInteger(
    limit,
    "limit",
    MAX_PAGE_SIZE
  );
  const skip = (normalizedPage - 1) * normalizedLimit;

  if (!Number.isSafeInteger(skip)) {
    throw new Error("Page and limit produce an excessively large offset");
  }

  const query = {};

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

const updateLead = async (id, leadData) => {
  const updates = pickAllowedLeadFields(leadData);

  if (Object.keys(updates).length === 0) {
    throw new Error(
      "At least one valid field is required to update a lead"
    );
  }

  const updatedLead = await Lead.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
    runValidators: true,
  });

  return updatedLead;
};

const deleteLead = async (id) => {
  const deletedLead = await Lead.findByIdAndDelete(id);

  return deletedLead;
};

const getLeadStats = async () => {
  const stats = await Lead.aggregate([
    {
      $match: {
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
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
};
