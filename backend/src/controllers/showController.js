const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");

exports.getShows = async (req, res) => {
  const { movieId, theaterId, date } = req.query;
  const qb = AppDataSource.getRepository("Show")
    .createQueryBuilder("show")
    .leftJoinAndSelect("show.movie", "movie")
    .leftJoinAndSelect("show.screen", "screen")
    .leftJoinAndSelect("screen.theater", "theater");

  if (movieId) qb.andWhere("movie.id = :movieId", { movieId });
  if (theaterId) qb.andWhere("theater.id = :theaterId", { theaterId });
  if (date) {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    qb.andWhere("show.start_time >= :start AND show.start_time < :end", { start, end });
  }
  res.json(await qb.getMany());
};

exports.getShowById = async (req, res) => {
  const show = await AppDataSource.getRepository("Show").findOne({
    where: { id: req.params.id },
    relations: { movie: true, screen: { theater: true } },
  });
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");

  const occupied = await AppDataSource.getRepository("ShowSeatState").count({
    where: { show: { id: show.id }, status: "booked" },
  });
  res.json({ ...show, availableSeats: show.screen.total_seats - occupied });
};

exports.getSeatsByShow = async (req, res) => {
  const { showId } = req.params;
  const show = await AppDataSource.getRepository("Show").findOne({
    where: { id: showId },
    relations: { screen: { seats: true } },
  });
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");

  const states = await AppDataSource.getRepository("ShowSeatState").find({
    where: { show: { id: showId } },
    relations: { seat: true },
  });
  const stateBySeatId = new Map(states.map((state) => [String(state.seat.id), state]));
  const now = new Date();
  const seats = show.screen.seats.map((seat) => {
    const state = stateBySeatId.get(String(seat.id));
    let status = "available";
    if (state?.status === "booked") status = "occupied";
    else if (state?.status === "locked" && new Date(state.locked_until) > now) status = "locked";
    return { ...seat, status };
  });
  res.json(seats);
};

exports.createShow = async (req, res) => {
  const repo = AppDataSource.getRepository("Show");
  const show = repo.create(res.locals.validated.body);
  await repo.save(show);
  res.status(201).json(show);
};
