const createAuthError = (code, statusCode, message) => {
  const error = new Error(message);
  error.name = "AuthError";
  error.code = code;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (
    typeof secret !== "string" ||
    !secret.trim() ||
    Buffer.byteLength(secret, "utf8") < 32
  ) {
    throw createAuthError(
      "AUTH_CONFIGURATION_ERROR",
      500,
      "Authentication is not configured"
    );
  }

  return secret;
};

module.exports = { createAuthError, getJwtSecret };
