const { AppDataSource } = require("../config/database");
const { In } = require("typeorm");

exports.getUserRecommendations = async (req, res) => {
  const userId = req.user.id;

  const userGenres = await AppDataSource.getRepository("Booking")
    .createQueryBuilder("booking")
    .innerJoin("booking.user", "user")
    .innerJoin("booking.show", "show")
    .innerJoin("show.movie", "movie")
    .innerJoin("movie.genres", "genre")
    .where("user.id = :userId", { userId })
    .andWhere("booking.status IN (:...bookingStatuses)", {
      bookingStatuses: ["confirmed", "used"],
    })
    .select("genre.id", "genreId")
    .addSelect("genre.name", "genreName")
    .addSelect("COUNT(*)", "count")
    .groupBy("genre.id")
    .addGroupBy("genre.name")
    .orderBy("COUNT(*)", "DESC")
    .limit(3)
    .getRawMany();
  if (userGenres.length === 0) return res.json(await exports.getTrendingMoviesData());

  const genreIds = userGenres.map((item) => item.genreId);
  const recs = await AppDataSource.getRepository("Movie")
    .createQueryBuilder("movie")
    .leftJoinAndSelect("movie.genres", "genre")
    .where("movie.status = :status", { status: "now_showing" })
    .andWhere("genre.id IN (:...genreIds)", { genreIds })
    .orderBy("movie.rating", "DESC")
    .limit(6)
    .getMany();
  return res.json(recs);
};

exports.getTrendingMovies = async (req, res) => {
  res.json(await exports.getTrendingMoviesData());
};

exports.getTrendingMoviesData = async () => {
  const rankedMovies = await AppDataSource.getRepository("Booking")
    .createQueryBuilder("booking")
    .innerJoin("booking.show", "show")
    .innerJoin("show.movie", "movie")
    .where("booking.created_at >= DATEADD(day, -7, GETDATE())")
    .andWhere("booking.status IN (:...bookingStatuses)", {
      bookingStatuses: ["confirmed", "used"],
    })
    .select("movie.id", "movieId")
    .addSelect("COUNT(booking.id)", "bookingCount")
    .groupBy("movie.id")
    .orderBy("COUNT(booking.id)", "DESC")
    .limit(4)
    .getRawMany();

  const movieRepo = AppDataSource.getRepository("Movie");
  if (rankedMovies.length === 0) {
    return movieRepo.find({ where: { status: "now_showing" }, take: 4 });
  }
  const ids = rankedMovies.map((row) => row.movieId);
  const movies = await movieRepo.find({ where: { id: In(ids) } });
  const moviesById = new Map(movies.map((movie) => [String(movie.id), movie]));
  return rankedMovies
    .map((row) => {
      const movie = moviesById.get(String(row.movieId));
      return movie ? { ...movie, bookingCount: Number(row.bookingCount) } : null;
    })
    .filter(Boolean);
};
