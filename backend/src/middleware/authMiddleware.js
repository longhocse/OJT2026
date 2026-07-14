const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/AppError");

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

/*Phân quyền cho admin*/
exports.adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new AppError(403, "ADMIN_REQUIRED", "Admin access required"));
  }
  next();
};

/*Phân quyền cho manager*/
exports.managerMiddleware = (req, res, next) => {
  if (req.user?.role !== "manager") {
    return next(new AppError(403, "MANAGER_REQUIRED", "Manager access required"));
  }
  next();
};

/*Phân quyền cho cả admin và manager*/
exports.adminOrManagerMiddleware = (req, res, next) => {
  if (!["admin", "manager"].includes(req.user?.role)) {
    return next(
      new AppError(
        403,
        "ADMIN_OR_MANAGER_REQUIRED",
        "Admin or Manager access required"
      )
    );
  }
  next();
};
