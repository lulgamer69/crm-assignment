const authService = require("../services/authService");
const { createAuthError } = require("../config/jwt");

const isRequestBodyObject = (body) =>
  typeof body === "object" && body !== null && !Array.isArray(body);

const signup = async (req, res, next) => {
  if (!isRequestBodyObject(req.body)) {
    return next(
      createAuthError(
        "AUTH_VALIDATION_ERROR",
        400,
        "Request body must be a JSON object"
      )
    );
  }

  try {
    const data = await authService.signup(req.body);
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  if (!isRequestBodyObject(req.body)) {
    return next(
      createAuthError(
        "AUTH_VALIDATION_ERROR",
        400,
        "Request body must be a JSON object"
      )
    );
  }

  try {
    const data = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.auth.userId);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  if (!isRequestBodyObject(req.body)) {
    return next(createAuthError("AUTH_VALIDATION_ERROR", 400, "Request body must be a JSON object"));
  }
  try {
    const user = await authService.updateProfile(req.auth.userId, req.body);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
};
