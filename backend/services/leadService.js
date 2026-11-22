const mongoose = require("mongoose");
const Lead = require("../models/lead");
const notificationService = require("./notificationService");

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
const TREND_PERIODS = new Set([
  "24h",
  "7d",
  "30d",
  "12m",
]);

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

  await notificationService.createLeadNotification(ownerId, lead, "created");

  return lead;
};

const getLeadById = async (id, ownerId) => {
  const lead = await Lead.findOne({ _id: id, owner: ownerId });
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

  if (updatedLead) {
    await notificationService.createLeadNotification(ownerId, updatedLead, "updated");
  }

  return updatedLead;
};

const deleteLead = async (id, ownerId) => {
  const deletedLead = await Lead.findOneAndDelete({ _id: id, owner: ownerId });

  if (deletedLead) {
    await notificationService.createLeadNotification(ownerId, deletedLead, "deleted");
  }

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

const getLeadTrends = async (ownerId, period, now = new Date()) => {
  if (!TREND_PERIODS.has(period)) {
    throw createInputValidationError("Period must be 24h, 7d, 30d, or 12m");
  }

  let start;
  let end;
  let unit;
  let bucketCount;

  if (period === "24h") {
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
    start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    unit = "hour";
    bucketCount = 24;
  } else if (period === "7d" || period === "30d") {
    bucketCount = period === "7d" ? 7 : 30;
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    start = new Date(end.getTime() - bucketCount * 24 * 60 * 60 * 1000);
    unit = "day";
  } else {
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    unit = "month";
    bucketCount = 12;
  }

  const grouped = await Lead.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(ownerId),
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit, timezone: "UTC" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const countByStart = new Map(grouped.map((item) => [item._id.toISOString(), item.count]));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    if (unit === "hour") bucketStart.setUTCHours(bucketStart.getUTCHours() + index);
    else if (unit === "day") bucketStart.setUTCDate(bucketStart.getUTCDate() + index);
    else bucketStart.setUTCMonth(bucketStart.getUTCMonth() + index);
    return { start: bucketStart.toISOString(), count: countByStart.get(bucketStart.toISOString()) ?? 0 };
  });

  return { period, timezone: "UTC", start: start.toISOString(), end: end.toISOString(), buckets };
};

module.exports = {
  INPUT_VALIDATION_ERROR_CODE,
  createLead,
  getLeadById,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
  getLeadTrends,
};
