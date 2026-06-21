const { AppDataSource } = require("../config/database");
const { Like } = require("typeorm");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  created_at: user.created_at,
});

exports.getAllUsers = async (req, res) => {
  const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = search
    ? [{ name: Like(`%${search}%`) }, { email: Like(`%${search}%`) }]
    : undefined;

  const [users, total] = await AppDataSource.getRepository("User").findAndCount({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      created_at: true,
    },
    where,
    order: { created_at: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json({
    success: true,
    data: users.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};
