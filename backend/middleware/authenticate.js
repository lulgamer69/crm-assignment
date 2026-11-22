const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { createAuthError, getJwtSecret } = require("../config/jwt");
const User = require("../models/user");

const unauthorizedError = () =>
  createAuthError(
    "AUTH_UNAUTHORIZED",
    401,
    "Invalid or expired authentication token"
  );

const authenticate = async (req, res, next) => {
  const authorization = req.get("authorization");
  if (!authorization) {
    return next(
      createAuthError("AUTH_UNAUTHORIZED", 401, "Authentication required")
    );
  }

  const tokenMatch = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
  if (!tokenMatch) {
    return next(unauthorizedError());
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch (error) {
    return next(error);
  }

  let claims;
  try {
    claims = jwt.verify(tokenMatch[1], secret, { algorithms: ["HS256"] });
  } catch {
    return next(unauthorizedError());
  }

  if (
    !claims ||
    typeof claims !== "object" ||
    typeof claims.sub !== "string" ||
    !mongoose.isValidObjectId(claims.sub)
  ) {
    return next(unauthorizedError());
  }

  let userExists;
  try {
    userExists = await User.exists({ _id: claims.sub });
  } catch (error) {
    return next(error);
  }

  if (!userExists) {
    return next(unauthorizedError());
  }

  req.auth = { userId: claims.sub };
  return next();
};

module.exports = authenticate;
