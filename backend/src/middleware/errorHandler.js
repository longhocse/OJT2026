const logger = require("../utils/logger");

exports.errorHandler = (err, req, res, _next) => {
  const duplicate = err?.number === 2627 || err?.number === 2601;
  const status = duplicate ? 409 : err.status || 500;
  const code = duplicate
    ? "RESOURCE_CONFLICT"
    : err.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
  const message = duplicate
    ? "Resource already exists"
    : status === 500
      ? "Internal server error"
      : err.message;

  if (status >= 500) {
    logger.error("request_failed", {
      requestId: req.id ?? "no-request-id",
      method: req.method,
      path: req.path,
      error: err,
    });
  }

  res.status(status).json({
    code,
    message,
    errors: Array.isArray(err.errors) ? err.errors : [],
  });
};

exports.notFoundHandler = (req, res) =>
  res.status(404).json({
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    errors: [],
  });
