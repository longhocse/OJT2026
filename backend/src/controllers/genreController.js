const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");

exports.getGenres = async (req, res) => {
  const genres = await AppDataSource.getRepository("Genre").find({ order: { name: "ASC" } });
  res.json(genres);
};

exports.createGenre = async (req, res) => {
  if (req.user.role === "manager") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Managers cannot create genres"
    );
  }
  const repo = AppDataSource.getRepository("Genre");
  if (await repo.findOne({ where: { name: req.body.name } })) {
    throw new AppError(409, "GENRE_ALREADY_EXISTS", "Genre already exists");
  }
  const genre = repo.create(res.locals.validated.body);
  await repo.save(genre);
  res.status(201).json(genre);
};

exports.updateGenre = async (req, res) => {
  if (req.user.role === "manager") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Managers cannot update genres"
    );
  }
  const repo = AppDataSource.getRepository("Genre");
  const genre = await repo.findOneBy({ id: req.params.id });
  if (!genre) throw new AppError(404, "GENRE_NOT_FOUND", "Genre not found");
  repo.merge(genre, res.locals.validated.body);
  await repo.save(genre);
  res.json(genre);
};

exports.deleteGenre = async (req, res) => {
  if (req.user.role === "manager") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Managers cannot delete genres"
    );
  }
  const result = await AppDataSource.getRepository("Genre").delete(req.params.id);
  if (result.affected === 0) throw new AppError(404, "GENRE_NOT_FOUND", "Genre not found");
  res.json({ message: "Deleted" });
};
