const { AppDataSource } = require("../config/database");

exports.getAuditLogs = async (req, res) => {
  const { page = 1, limit = 20, action, resourceType, actorUserId } = res.locals.validated.query;
  const qb = AppDataSource.getRepository("AuditLog")
    .createQueryBuilder("audit")
    .leftJoinAndSelect("audit.actor", "actor");

  if (action) qb.andWhere("audit.action = :action", { action });
  if (resourceType) qb.andWhere("audit.resource_type = :resourceType", { resourceType });
  if (actorUserId) qb.andWhere("audit.actor_user_id = :actorUserId", { actorUserId });

  const [items, total] = await qb
    .orderBy("audit.created_at", "DESC")
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  res.json({
    data: items.map((item) => ({
      id: item.id,
      action: item.action,
      resource_type: item.resource_type,
      resource_id: item.resource_id,
      metadata_json: item.metadata_json,
      created_at: item.created_at,
      actor: item.actor
        ? {
            id: item.actor.id,
            email: item.actor.email,
            name: item.actor.name,
            role: item.actor.role,
          }
        : null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
