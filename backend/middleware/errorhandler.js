const getErrorStatusCode = (error) => {
  const statusCode = [error?.statusCode, error?.status].find(
    (status) => Number.isInteger(status) && status >= 400 && status <= 599
  );

  return statusCode ?? 500;
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isMalformedJson = err?.type === "entity.parse.failed";
  const statusCode = isMalformedJson ? 400 : getErrorStatusCode(err);

  const isOperationalAuthError =
    err?.name === "AuthError" && err?.isOperational === true;

  if (statusCode >= 500 && !isOperationalAuthError) {
    console.error("Unhandled request error", { statusCode });

    return res.status(statusCode).json({
      success: false,
      message: "Internal server error",
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: isMalformedJson
      ? "Malformed JSON request body"
      : isOperationalAuthError
        ? err.message
        : "Request failed",
  });
};

module.exports = errorHandler;
