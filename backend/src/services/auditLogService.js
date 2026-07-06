const { AppDataSource } = require("../config/database");
const logger = require("../utils/logger");

const safeMetadata = (metadata) => {
  if (!metadata) return null;
  return JSON.stringify(metadata, (_key, value) => {
    if (typeof value === "bigint") return value.toString();
    return value;
  });
};

const recordAuditLog = async (
  req,
  { action, resourceType, resourceId = null, metadata = null },
) => {
  try {
    if (!AppDataSource.hasMetadata("AuditLog")) return;
    await AppDataSource.getRepository("AuditLog").save({
      actor: req.user?.id ? { id: req.user.id } : null,
      actor_user_id: req.user?.id || null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata_json: safeMetadata(metadata),
    });
  } catch (error) {
    logger.error("audit_log_write_failed", {
      action,
      resourceType,
      resourceId,
      error: { name: error.name, message: error.message },
    });
  }
};

module.exports = { recordAuditLog };
