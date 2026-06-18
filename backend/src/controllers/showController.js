const { AppDataSource } = require("../config/database");
const { MoreThan } = require("typeorm");

exports.getShows = async (req, res) => {
  try {
    const { movieId, theaterId, date } = req.query;
    const repo = AppDataSource.getRepository("Show");
    const qb = repo.createQueryBuilder("show")
      .leftJoinAndSelect("show.movie", "movie")
      .leftJoinAndSelect("show.screen", "screen")
      .leftJoinAndSelect("screen.theater", "theater");
    if (movieId) qb.andWhere("movie.id = :movieId", { movieId });
    if (theaterId) qb.andWhere("theater.id = :theaterId", { theaterId });
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      qb.andWhere("show.start_time BETWEEN :start AND :end", { start, end });
    }
    const shows = await qb.getMany();
    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getShowById = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Show");
    const show = await repo.findOne({
      where: { id: req.params.id },
      relations: ["movie", "screen", "screen.theater"],
    });
    if (!show) return res.status(404).json({ message: "Not found" });
    const bookingSeatRepo = AppDataSource.getRepository("BookingSeat");
    const occupied = await bookingSeatRepo
      .createQueryBuilder("bs")
      .innerJoin("bs.booking", "b")
      .where("b.showId = :showId", { showId: show.id })
      .andWhere("b.status != 'cancelled'")
      .getCount();
    res.json({ ...show, availableSeats: show.screen.total_seats - occupied });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSeatsByShow = async (req, res) => {
  try {
    const { showId } = req.params;
    const showRepo = AppDataSource.getRepository("Show");
    const show = await showRepo.findOne({
      where: { id: showId },
      relations: ["screen", "screen.seats"],
    });
    if (!show) return res.status(404).json({ message: "Show not found" });
    const bookingSeatRepo = AppDataSource.getRepository("BookingSeat");
    const occupied = await bookingSeatRepo
      .createQueryBuilder("bs")
      .innerJoin("bs.booking", "b")
      .where("b.showId = :showId", { showId })
      .andWhere("b.status = 'confirmed'")
      .select("bs.seatId")
      .getRawMany();
    const occupiedIds = new Set(occupied.map(o => o.seatId));
    const seatRepo = AppDataSource.getRepository("Seat");
    const locked = await seatRepo.find({
      where: { status: "locked", locked_until: MoreThan(new Date()) },
    });
    const lockedIds = new Set(locked.map(l => l.id));
    const seats = show.screen.seats.map(seat => ({
      ...seat,
      status: occupiedIds.has(seat.id) ? "occupied" : lockedIds.has(seat.id) ? "locked" : "available",
    }));
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createShow = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Show");
    const show = repo.create(req.body);
    await repo.save(show);
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};