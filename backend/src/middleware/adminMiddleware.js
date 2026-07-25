const { AppError } = require("../utils/AppError");

module.exports = (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
  }
  if (req.user.role !== "admin") {
    return next(new AppError(403, "ADMIN_REQUIRED", "Admin access required"));
  }
  return next();
};
