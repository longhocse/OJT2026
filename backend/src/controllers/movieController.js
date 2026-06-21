const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");
const logger = require("../utils/logger");

const sanitizeReview = (review) => {
  if (!review.user) return review;
  const { password_hash, ...user } = review.user;
  return { ...review, user };
};

exports.getMovies = async (req, res) => {
  const { genre, minRating, sortBy = "release_date", page = 1, limit = 10, status } = req.query;
  const qb = AppDataSource.getRepository("Movie").createQueryBuilder("movie");
  if (genre) qb.andWhere("movie.genre LIKE :genre", { genre: `%${genre}%` });
  if (minRating) qb.andWhere("movie.rating >= :minRating", { minRating });
  if (status) qb.andWhere("movie.status = :status", { status });
  qb.orderBy(sortBy === "popular" ? "movie.rating" : "movie.release_date", "DESC");

  const [movies, total] = await qb
    .skip((Number(page) - 1) * Number(limit))
    .take(Number(limit))
    .getManyAndCount();
  res.json({
    data: movies,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

exports.getMovieById = async (req, res) => {
  const movie = await AppDataSource.getRepository("Movie").findOne({
    where: { id: req.params.id },
    relations: { reviews: { user: true } },
  });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  res.json({ ...movie, reviews: movie.reviews.map(sanitizeReview) });
};

exports.createMovie = async (req, res) => {
  const repo = AppDataSource.getRepository("Movie");
  const movie = repo.create(res.locals.validated.body);
  await repo.save(movie);
  res.status(201).json(movie);
};

exports.updateMovie = async (req, res) => {
  const repo = AppDataSource.getRepository("Movie");
  const movie = await repo.findOneBy({ id: req.params.id });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  repo.merge(movie, res.locals.validated.body);
  await repo.save(movie);
  res.json(movie);
};

exports.deleteMovie = async (req, res) => {
  const result = await AppDataSource.getRepository("Movie").delete(req.params.id);
  if (result.affected === 0) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  res.json({ message: "Deleted" });
};

exports.getReviews = async (req, res) => {
  const reviews = await AppDataSource.getRepository("Review").find({
    where: { movie: { id: req.params.movieId } },
    relations: { user: true },
    order: { created_at: "DESC" },
  });
  res.json(reviews.map(sanitizeReview));
};

exports.addReview = async (req, res, next) => {
  const { rating, comment } = res.locals.validated.body;
  const movieId = req.params.movieId;
  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;

    const movieRepo = queryRunner.manager.getRepository("Movie");
    const bookingRepo = queryRunner.manager.getRepository("Booking");
    const reviewRepo = queryRunner.manager.getRepository("Review");
    const movie = await movieRepo.findOne({
      where: { id: movieId },
      lock: { mode: "pessimistic_write" },
    });
    if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");

    const eligibleBooking = await bookingRepo
      .createQueryBuilder("booking")
      .innerJoin("booking.user", "bookingUser")
      .innerJoin("booking.show", "show")
      .innerJoin("show.movie", "bookedMovie")
      .where("bookingUser.id = :userId", { userId: req.user.id })
      .andWhere("bookedMovie.id = :movieId", { movieId })
      .andWhere("booking.status = :status", { status: "confirmed" })
      .getOne();
    if (!eligibleBooking) {
      throw new AppError(
        403,
        "REVIEW_NOT_ALLOWED",
        "A confirmed booking is required to review this movie",
      );
    }

    let review = await reviewRepo.findOne({
      where: { user: { id: req.user.id }, movie: { id: movieId } },
      lock: { mode: "pessimistic_write" },
    });
    const created = !review;
    if (!review) {
      review = reviewRepo.create({
        user: { id: req.user.id },
        movie: { id: movieId },
      });
    }
    review.rating = rating;
    review.comment = comment || null;
    await queryRunner.manager.save(review);

    const avgResult = await reviewRepo
      .createQueryBuilder("review")
      .innerJoin("review.movie", "reviewedMovie")
      .select("AVG(review.rating)", "avg")
      .where("reviewedMovie.id = :movieId", { movieId })
      .getRawOne();
    movie.rating = Number(avgResult.avg) || 0;
    await queryRunner.manager.save(movie);

    await queryRunner.commitTransaction();
    transactionStarted = false;
    return res.status(created ? 201 : 200).json(review);
  } catch (error) {
    if (transactionStarted) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError) {
        return next(rollbackError);
      }
    }
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch (releaseError) {
      logger.error("review_query_runner_release_failed", { error: releaseError });
    }
  }
};
