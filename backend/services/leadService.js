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
  let query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const totalLeads = await Lead.countDocuments(query);

  const leads = await Lead.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return {
    leads,
    totalLeads,
    totalPages: Math.ceil(totalLeads / limit),
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
    converted: 0,
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

      case "Converted":
        result.converted = item.count;
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
