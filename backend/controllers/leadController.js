const mongoose = require("mongoose");
const leadService = require("../services/leadService");

const isRequestBodyObject = (body) =>
  typeof body === "object" && body !== null && !Array.isArray(body);

const sendErrorResponse = (res, error, next) => {
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

  return next(error);
};

const createLead = async (req, res, next) => {
  if (!isRequestBodyObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a non-null object",
    });
  }

  try {
    const lead = await leadService.createLead(req.body, req.auth.userId);

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    return sendErrorResponse(res, error, next);
  }
};

const getAllLeads = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = req.query.limit === undefined ? 10 : req.query.limit;
    const result = await leadService.getAllLeads(
      req.auth.userId,
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
    return sendErrorResponse(res, error, next);
  }
};

const updateLead = async (req, res, next) => {
  if (!isRequestBodyObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a non-null object",
    });
  }

  try {
    const updatedLead = await leadService.updateLead(
      req.params.id,
      req.body,
      req.auth.userId
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
    return sendErrorResponse(res, error, next);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    const deletedLead = await leadService.deleteLead(
      req.params.id,
      req.auth.userId
    );

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
    return sendErrorResponse(res, error, next);
  }
};

const getLeadStats = async (req, res, next) => {
  try {
    const stats = await leadService.getLeadStats(req.auth.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return sendErrorResponse(res, error, next);
  }
};

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLeadStats,
};
