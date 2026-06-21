const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");

exports.getCinemas = async (req, res) => {
  const cinemas = await AppDataSource.getRepository("Theater").find({
    order: { name: "ASC" },
    relations: ["screens"],
  });
  res.json(cinemas);
};

exports.getCinemaById = async (req, res) => {
  const cinema = await AppDataSource.getRepository("Theater").findOne({
    where: { id: req.params.id },
    relations: ["screens"],
  });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
  res.json(cinema);
};

exports.createCinema = async (req, res) => {
  const repo = AppDataSource.getRepository("Theater");
  const cinema = repo.create(res.locals.validated.body);
  await repo.save(cinema);
  res.status(201).json(cinema);
};

exports.updateCinema = async (req, res) => {
  const repo = AppDataSource.getRepository("Theater");
  const cinema = await repo.findOneBy({ id: req.params.id });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
  repo.merge(cinema, res.locals.validated.body);
  await repo.save(cinema);
  res.json(cinema);
};

exports.deleteCinema = async (req, res) => {
  const result = await AppDataSource.getRepository("Theater").delete(req.params.id);
  if (result.affected === 0) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
  res.json({ message: "Deleted" });
};
