const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/AppError");
const { ADMIN_ROLE, requireAnyRole } = require("../services/accessControlService");

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_error) {
    return next(new AppError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
};

exports.adminMiddleware = (req, res, next) => {
  if (req.user?.role !== ADMIN_ROLE) {
    return next(new AppError(403, "ADMIN_REQUIRED", "Admin access required"));
  }
  next();
};

exports.roleMiddleware = requireAnyRole;
