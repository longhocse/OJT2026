const { z } = require("zod");

const formatIssues = (location, issues) =>
  issues.map((issue) => ({
    field: [location, ...issue.path].join("."),
    message: issue.message,
  }));

const validateRequest =
  ({ body, query, params } = {}) =>
  (req, res, next) => {
    const schemas = { body, query, params };
    const parsed = {};
    const errors = [];

    for (const [location, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (!result.success) {
        errors.push(...formatIssues(location, result.error.issues));
      } else {
        parsed[location] = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors,
      });
    }

    if (parsed.body) req.body = parsed.body;
    res.locals.validated = parsed;
    return next();
  };

module.exports = { validateRequest, z };
