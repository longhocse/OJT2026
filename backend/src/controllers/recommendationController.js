const { AppDataSource } = require("../config/database");

exports.getUserRecommendations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      const trending = await exports.getTrendingMoviesData();
      return res.json(trending);
    }
    const bookingRepo = AppDataSource.getRepository("Booking");
    const userGenres = await bookingRepo
      .createQueryBuilder("booking")
      .innerJoin("booking.show", "show")
      .innerJoin("show.movie", "movie")
      .where("booking.userId = :userId", { userId })
      .select("movie.genre", "genre")
      .addSelect("COUNT(*)", "count")
      .groupBy("movie.genre")
      .orderBy("count", "DESC")
      .limit(3)
      .getRawMany();
    if (userGenres.length === 0) {
      const trending = await exports.getTrendingMoviesData();
      return res.json(trending);
    }
    const genres = userGenres.map(g => g.genre);
    const movieRepo = AppDataSource.getRepository("Movie");
    const recs = await movieRepo
      .createQueryBuilder("movie")
      .where("movie.status = 'now_showing'")
      .andWhere("movie.genre IN (:...genres)", { genres })
      .orderBy("movie.rating", "DESC")
      .limit(6)
      .getMany();
    res.json(recs);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTrendingMovies = async (req, res) => {
  try {
    const trending = await exports.getTrendingMoviesData();
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTrendingMoviesData = async () => {
  const bookingRepo = AppDataSource.getRepository("Booking");
  const trending = await bookingRepo
    .createQueryBuilder("booking")
    .innerJoin("booking.show", "show")
    .innerJoin("show.movie", "movie")
    .where("booking.created_at >= DATEADD(day, -7, GETDATE())")
    .select([
      "movie.id",
      "movie.title",
      "movie.description",
      "movie.genre",
      "movie.rating",
      "movie.duration",
      "movie.poster_url",
      "movie.release_date",
    ])
    .addSelect("COUNT(booking.id)", "bookingCount")
    .groupBy("movie.id")
    .orderBy("bookingCount", "DESC")
    .limit(4)
    .getRawMany();
  if (trending.length === 0) {
    const movieRepo = AppDataSource.getRepository("Movie");
    return await movieRepo.find({ where: { status: "now_showing" }, take: 4 });
  }
  return trending;
};