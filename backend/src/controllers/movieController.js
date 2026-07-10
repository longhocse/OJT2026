const { In } = require("typeorm");
const { AppDataSource } = require("../config/database");
const { recordAuditLog } = require("../services/auditLogService");
const { AppError } = require("../utils/AppError");

const sanitizeReview = (review) => {
  if (!review.user) return review;
  const { password_hash, ...user } = review.user;
  return { ...review, user };
};

const withReviewCount = (movie) => ({
  ...movie,
  reviewCount: Array.isArray(movie.reviews) ? movie.reviews.length : Number(movie.reviewCount) || 0,
});

const attachReviewCounts = async (movies) => {
  if (movies.length === 0) return movies;
  const movieIds = movies.map((movie) => movie.id);
  const rows = await AppDataSource.getRepository("Review")
    .createQueryBuilder("review")
    .innerJoin("review.movie", "movie")
    .select("movie.id", "movieId")
    .addSelect("COUNT(review.id)", "reviewCount")
    .where("movie.id IN (:...movieIds)", { movieIds })
    .groupBy("movie.id")
    .getRawMany();
  const counts = new Map(rows.map((row) => [String(row.movieId), Number(row.reviewCount) || 0]));
  return movies.map((movie) => ({ ...movie, reviewCount: counts.get(String(movie.id)) || 0 }));
};

const resolveGenres = async (genreIds = []) => {
  if (genreIds.length === 0) return [];
  const genres = await AppDataSource.getRepository("Genre").find({
    where: { id: In(genreIds) },
  });
  if (genres.length !== genreIds.length) {
    throw new AppError(400, "GENRE_NOT_FOUND", "One or more genres do not exist");
  }
  return genres;
};

const countReferences = async (repositoryName, where) => {
  try {
    return await AppDataSource.getRepository(repositoryName).count({ where });
  } catch (error) {
    if (error.name === "EntityMetadataNotFoundError") return 0;
    throw error;
  }
};

const nullableMovieFields = [
  "description",
  "director",
  "cast",
  "language",
  "country",
  "age_rating",
  "poster_url",
  "trailer_url",
  "release_date",
];

const POSTER_IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const META_IMAGE_PATTERN =
  /<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i;
const META_IMAGE_PATTERN_REVERSED =
  /<meta\b(?=[^>]*content=["']([^"']+)["'])(?=[^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["'])[^>]*>/i;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const extractYouTubeVideoId = (trailerUrl) => {
  if (!trailerUrl || !isHttpUrl(trailerUrl)) return null;
  const url = new URL(trailerUrl);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (
    !["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(
      hostname,
    )
  ) {
    return null;
  }

  const watchId = url.searchParams.get("v");
  if (YOUTUBE_ID_PATTERN.test(watchId)) return watchId;

  const [section, id] = url.pathname.split("/").filter(Boolean);
  if (["embed", "shorts", "live"].includes(section) && YOUTUBE_ID_PATTERN.test(id)) {
    return id;
  }

  return null;
};

const normalizeTrailerUrl = (trailerUrl) => {
  if (!trailerUrl) return trailerUrl;
  const youtubeId = extractYouTubeVideoId(trailerUrl);
  return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : trailerUrl;
};

const resolveMetaImageUrl = (candidate, pageUrl) => {
  if (!candidate) return null;
  try {
    const resolved = new URL(candidate, pageUrl).href;
    return isHttpUrl(resolved) && resolved.length <= 500 ? resolved : null;
  } catch {
    return null;
  }
};

const resolvePosterUrl = async (posterUrl) => {
  if (!posterUrl || !isHttpUrl(posterUrl) || POSTER_IMAGE_EXTENSION.test(posterUrl)) {
    return posterUrl;
  }

  try {
    const response = await fetch(posterUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "MovieTap/1.0 poster resolver",
      },
      signal: AbortSignal.timeout(3000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) return posterUrl;
    const html = (await response.text()).slice(0, 200000);
    const match = html.match(META_IMAGE_PATTERN) || html.match(META_IMAGE_PATTERN_REVERSED);
    return resolveMetaImageUrl(match?.[1], posterUrl) || posterUrl;
  } catch (_error) {
    return posterUrl;
  }
};

const normalizeMovieFields = async (fields) => {
  const normalized = { ...fields };
  nullableMovieFields.forEach((field) => {
    if (normalized[field] === "") normalized[field] = null;
  });
  normalized.poster_url = await resolvePosterUrl(normalized.poster_url);
  normalized.trailer_url = normalizeTrailerUrl(normalized.trailer_url);
  return normalized;
};

exports.getMovies = async (req, res) => {
  const {
    genre,
    minRating,
    sortBy = "release_date",
    page = 1,
    limit = 10,
    status,
  } = res.locals.validated.query;
  const qb = AppDataSource.getRepository("Movie")
    .createQueryBuilder("movie")
    .leftJoinAndSelect("movie.genres", "genre")
    .where("movie.is_active = :active", { active: true });
  if (genre) qb.andWhere("genre.name LIKE :genre", { genre: `%${genre}%` });
  if (minRating) qb.andWhere("movie.rating >= :minRating", { minRating });
  if (status) qb.andWhere("movie.status = :status", { status });
  qb.orderBy(sortBy === "popular" ? "movie.rating" : "movie.release_date", "DESC");
  const [movies, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  const moviesWithReviewCounts = await attachReviewCounts(movies);
  res.json({
    data: moviesWithReviewCounts.map(withReviewCount),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.getMovieById = async (req, res) => {
  const movie = await AppDataSource.getRepository("Movie").findOne({
    where: { id: req.params.id, is_active: true },
    relations: { genres: true, reviews: { user: true } },
  });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  res.json(withReviewCount({ ...movie, reviews: movie.reviews.map(sanitizeReview) }));
};

exports.createMovie = async (req, res) => {
  const repository = AppDataSource.getRepository("Movie");
  const { genreIds = [], ...fields } = res.locals.validated.body;
  const movie = repository.create({
    ...(await normalizeMovieFields(fields)),
    rating: 0,
    genres: await resolveGenres(genreIds),
  });
  await repository.save(movie);
  await recordAuditLog(req, {
    action: "movie.create",
    resourceType: "Movie",
    resourceId: movie.id,
    metadata: { title: movie.title },
  });
  res.status(201).json(movie);
};

exports.updateMovie = async (req, res) => {
  const repository = AppDataSource.getRepository("Movie");
  const movie = await repository.findOne({
    where: { id: req.params.id, is_active: true },
    relations: { genres: true },
  });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  const { genreIds, ...fields } = res.locals.validated.body;
  repository.merge(movie, await normalizeMovieFields(fields));
  if (genreIds) movie.genres = await resolveGenres(genreIds);
  await repository.save(movie);
  await recordAuditLog(req, {
    action: "movie.update",
    resourceType: "Movie",
    resourceId: movie.id,
    metadata: { title: movie.title },
  });
  res.json(movie);
};

exports.deleteMovie = async (req, res) => {
  const repository = AppDataSource.getRepository("Movie");
  const movie = await repository.findOneBy({ id: req.params.id });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");

  const [showCount, reviewCount] = await Promise.all([
    countReferences("Show", { movie: { id: movie.id } }),
    countReferences("Review", { movie: { id: movie.id } }),
  ]);
  if (showCount > 0 || reviewCount > 0) {
    movie.is_active = false;
    movie.status = "ended";
    await repository.save(movie);
    await recordAuditLog(req, {
      action: "movie.deactivate",
      resourceType: "Movie",
      resourceId: movie.id,
      metadata: { reason: "referenced_resource", showCount, reviewCount },
    });
    return res.json({
      code: "MOVIE_IN_USE_DEACTIVATED",
      message: "Movie is referenced by shows or reviews and was deactivated instead of deleted",
    });
  }

  await repository.delete(movie.id);
  await recordAuditLog(req, {
    action: "movie.delete",
    resourceType: "Movie",
    resourceId: movie.id,
  });
  return res.json({ message: "Deleted" });
};

exports.getReviews = async (req, res) => {
  const reviews = await AppDataSource.getRepository("Review").find({
    where: { movie: { id: req.params.movieId } },
    relations: { user: true },
    order: { created_at: "DESC" },
  });
  res.json(reviews.map(sanitizeReview));
};

const withReviewTransaction = async (work) => {
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction("SERIALIZABLE");
  try {
    const result = await work(runner.manager);
    await runner.commitTransaction();
    return result;
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};

const loadMovieForRating = async (manager, movieId) => {
  const movie = await manager.getRepository("Movie").findOne({
    where: { id: movieId },
    lock: { mode: "pessimistic_write" },
  });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");
  return movie;
};

const assertReviewEligibility = async (manager, userId, movieId) => {
  const eligible = await manager
    .getRepository("Booking")
    .createQueryBuilder("booking")
    .innerJoin("booking.user", "bookingUser")
    .innerJoin("booking.show", "show")
    .innerJoin("show.movie", "bookedMovie")
    .where("bookingUser.id = :userId", { userId })
    .andWhere("bookedMovie.id = :movieId", { movieId })
    .andWhere("booking.status = :status", { status: "used" })
    .getOne();
  if (!eligible) {
    throw new AppError(403, "REVIEW_NOT_ALLOWED", "A used ticket is required to review this movie");
  }
};

const recalculateMovieRating = async (manager, movie) => {
  const result = await manager
    .getRepository("Review")
    .createQueryBuilder("review")
    .innerJoin("review.movie", "reviewedMovie")
    .select("AVG(review.rating)", "avg")
    .where("reviewedMovie.id = :movieId", { movieId: movie.id })
    .getRawOne();
  movie.rating = Number(result?.avg) || 0;
  await manager.getRepository("Movie").save(movie);
};

exports.addReview = async (req, res) => {
  const review = await withReviewTransaction(async (manager) => {
    const movie = await loadMovieForRating(manager, req.params.movieId);
    await assertReviewEligibility(manager, req.user.id, movie.id);
    const repository = manager.getRepository("Review");
    if (
      await repository.findOne({ where: { user: { id: req.user.id }, movie: { id: movie.id } } })
    ) {
      throw new AppError(
        409,
        "REVIEW_ALREADY_EXISTS",
        "Use the update endpoint for an existing review",
      );
    }
    const created = repository.create({
      user: { id: req.user.id },
      movie: { id: movie.id },
      rating: res.locals.validated.body.rating,
      comment: res.locals.validated.body.comment || null,
    });
    await repository.save(created);
    await recalculateMovieRating(manager, movie);
    return repository.findOne({
      where: { id: created.id },
      relations: { user: true, movie: true },
    });
  });
  res.status(201).json(sanitizeReview(review));
};

exports.updateReview = async (req, res) => {
  const review = await withReviewTransaction(async (manager) => {
    const movie = await loadMovieForRating(manager, req.params.movieId);
    await assertReviewEligibility(manager, req.user.id, movie.id);
    const repository = manager.getRepository("Review");
    const current = await repository.findOne({
      where: { id: req.params.reviewId },
      relations: { user: true, movie: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!current || String(current.movie.id) !== String(movie.id)) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }
    if (String(current.user.id) !== String(req.user.id)) {
      throw new AppError(403, "REVIEW_FORBIDDEN", "Only the review author can update it");
    }
    Object.assign(current, res.locals.validated.body);
    await repository.save(current);
    await recalculateMovieRating(manager, movie);
    return current;
  });
  res.json(sanitizeReview(review));
};

const deleteReview = async ({ movieId, reviewId, userId, moderation }) =>
  withReviewTransaction(async (manager) => {
    const movie = await loadMovieForRating(manager, movieId);
    const repository = manager.getRepository("Review");
    const review = await repository.findOne({
      where: { id: reviewId },
      relations: { user: true, movie: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!review || String(review.movie.id) !== String(movie.id)) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
    }
    if (!moderation && String(review.user.id) !== String(userId)) {
      throw new AppError(403, "REVIEW_FORBIDDEN", "Only the review author can delete it");
    }
    await repository.remove(review);
    await recalculateMovieRating(manager, movie);
  });

exports.deleteOwnReview = async (req, res) => {
  await deleteReview({
    movieId: req.params.movieId,
    reviewId: req.params.reviewId,
    userId: req.user.id,
    moderation: false,
  });
  res.json({ message: "Review deleted" });
};

exports.moderateReview = async (req, res) => {
  await deleteReview({
    movieId: req.params.movieId,
    reviewId: req.params.reviewId,
    userId: req.user.id,
    moderation: true,
  });
  res.json({ message: "Review removed by moderator" });
};
