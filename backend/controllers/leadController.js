const mongoose = require("mongoose");
const leadService = require("../services/leadService");

const isRequestBodyObject = (body) =>
  typeof body === "object" && body !== null && !Array.isArray(body);

const sendErrorResponse = (res, error) => {
  const isExpectedInputError =
    error?.code === leadService.INPUT_VALIDATION_ERROR_CODE ||
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError;

  if (isExpectedInputError) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Unexpected lead controller error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

const createLead = async (req, res) => {
  if (!isRequestBodyObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a non-null object",
    });
  }

  try {
    const lead = await leadService.createLead(req.body);

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getAllLeads = async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = req.query.limit === undefined ? 10 : req.query.limit;
    const result = await leadService.getAllLeads(
      req.query.search,
      req.query.status,
      page,
      limit
    );
    res.status(200).json({
      success: true,
      count: result.leads.length,
      totalLeads: result.totalLeads,
      totalPages: result.totalPages,
      currentPage: Number(page),
      data: result.leads,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const updateLead = async (req, res) => {
  if (!isRequestBodyObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a non-null object",
    });
  }

  try {
    const updatedLead = await leadService.updateLead(
      req.params.id,
      req.body
    );

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const deleteLead = async (req, res) => {
  try {
    const deletedLead = await leadService.deleteLead(req.params.id);

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
      data: deletedLead,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getLeadStats = async (req, res) => {
  try {
    const stats = await leadService.getLeadStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
};
