// backend/src/controllers/movieController.js
const { AppDataSource } = require("../config/database");

// Lấy danh sách phim với filter
exports.getMovies = async (req, res) => {
  try {
    const { genre, minRating, sortBy = "release_date", page = 1, limit = 10, status } = req.query;
    const repo = AppDataSource.getRepository("Movie");
    const qb = repo.createQueryBuilder("movie");
    
    if (genre) qb.andWhere("movie.genre LIKE :genre", { genre: `%${genre}%` });
    if (minRating) qb.andWhere("movie.rating >= :minRating", { minRating });
    if (status) qb.andWhere("movie.status = :status", { status });
    if (sortBy === "popular") qb.orderBy("movie.rating", "DESC");
    else qb.orderBy("movie.release_date", "DESC");
    
    const [movies, total] = await qb.skip((+page - 1) * +limit).take(+limit).getManyAndCount();
    res.json({ data: movies, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    console.error("❌ Get movies error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy chi tiết phim - SỬA LỖI relations
exports.getMovieById = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Movie");
    const movie = await repo.findOne({
      where: { id: req.params.id },
      relations: {
        reviews: {
          user: true  // SỬA: Dùng object syntax thay vì array
        }
      }
    });
    if (!movie) return res.status(404).json({ message: "Not found" });
    res.json(movie);
  } catch (error) {
    console.error("❌ Get movie error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Tạo phim mới (Admin)
exports.createMovie = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Movie");
    const movie = repo.create(req.body);
    await repo.save(movie);
    res.status(201).json(movie);
  } catch (error) {
    console.error("❌ Create movie error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật phim (Admin)
exports.updateMovie = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Movie");
    const movie = await repo.findOneBy({ id: req.params.id });
    if (!movie) return res.status(404).json({ message: "Not found" });
    repo.merge(movie, req.body);
    await repo.save(movie);
    res.json(movie);
  } catch (error) {
    console.error("❌ Update movie error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa phim (Admin)
exports.deleteMovie = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Movie");
    const result = await repo.delete(req.params.id);
    if (result.affected === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("❌ Delete movie error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy reviews của phim
exports.getReviews = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Review");
    const reviews = await repo.find({
      where: { movie: { id: req.params.movieId } },
      relations: {
        user: true  // SỬA: Dùng object syntax
      },
      order: { created_at: "DESC" },
    });
    res.json(reviews);
  } catch (error) {
    console.error("❌ Get reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Thêm review
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewRepo = AppDataSource.getRepository("Review");
    const movieRepo = AppDataSource.getRepository("Movie");
    
    const review = reviewRepo.create({
      rating,
      comment,
      user: { id: req.user.id },
      movie: { id: req.params.movieId },
    });
    await reviewRepo.save(review);
    
    const avgResult = await reviewRepo
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "avg")
      .where("review.movieId = :movieId", { movieId: req.params.movieId })
      .getRawOne();
      
    await movieRepo.update(req.params.movieId, { rating: parseFloat(avgResult.avg) || 0 });
    res.status(201).json(review);
  } catch (error) {
    console.error("❌ Add review error:", error);
    res.status(500).json({ message: "Server error" });
  }
};