const { AppDataSource } = require("../config/database");
const { recordAuditLog } = require("../services/auditLogService");
const { AppError } = require("../utils/AppError");

exports.getCinemas = async (req, res) => {
  const cinemas = await AppDataSource.getRepository("Theater").find({
    where: { is_active: true },
    order: { name: "ASC" },
    relations: { screens: true },
  });
  res.json(cinemas);
};

exports.getCinemaById = async (req, res) => {
  const cinema = await AppDataSource.getRepository("Theater").findOne({
    where: { id: req.params.id, is_active: true },
    relations: { screens: true },
  });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
  res.json(cinema);
};

exports.createCinema = async (req, res) => {
  const repo = AppDataSource.getRepository("Theater");
  const cinema = repo.create(res.locals.validated.body);
  await repo.save(cinema);
  await recordAuditLog(req, {
    action: "cinema.create",
    resourceType: "Theater",
    resourceId: cinema.id,
    metadata: { name: cinema.name },
  });
  res.status(201).json(cinema);
};

exports.updateCinema = async (req, res) => {
  const repo = AppDataSource.getRepository("Theater");
  const cinema = await repo.findOneBy({ id: req.params.id, is_active: true });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
  repo.merge(cinema, res.locals.validated.body);
  await repo.save(cinema);
  await recordAuditLog(req, {
    action: "cinema.update",
    resourceType: "Theater",
    resourceId: cinema.id,
    metadata: { name: cinema.name },
  });
  res.json(cinema);
};

exports.deleteCinema = async (req, res) => {
  const repo = AppDataSource.getRepository("Theater");
  const cinema = await repo.findOneBy({ id: req.params.id });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");

  const screenRepo = AppDataSource.getRepository("Screen");
  const showCount = await AppDataSource.getRepository("Show")
    .createQueryBuilder("show")
    .innerJoin("show.screen", "screen")
    .innerJoin("screen.theater", "theater")
    .where("theater.id = :cinemaId", { cinemaId: cinema.id })
    .getCount();
  const screenCount = await screenRepo.count({ where: { theater: { id: cinema.id } } });

  if (screenCount > 0 || showCount > 0) {
    cinema.is_active = false;
    await repo.save(cinema);
    await recordAuditLog(req, {
      action: "cinema.deactivate",
      resourceType: "Theater",
      resourceId: cinema.id,
      metadata: { reason: "referenced_resource", screenCount, showCount },
    });
    return res.json({
      code: "CINEMA_IN_USE_DEACTIVATED",
      message: "Cinema is referenced by rooms or shows and was deactivated instead of deleted",
    });
  }

  await repo.remove(cinema);
  await recordAuditLog(req, {
    action: "cinema.delete",
    resourceType: "Theater",
    resourceId: cinema.id,
  });
  return res.json({ message: "Deleted" });
};
