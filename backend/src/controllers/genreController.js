// backend/src/controllers/genreController.js
const { AppDataSource } = require("../config/database");

// Lấy danh sách thể loại
exports.getGenres = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Genre");
    const genres = await repo.find({ order: { name: "ASC" } });
    res.json(genres);
  } catch (error) {
    console.error("❌ Get genres error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Tạo thể loại mới (Admin)
exports.createGenre = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Genre");
    const existing = await repo.findOne({ where: { name: req.body.name } });
    if (existing) return res.status(400).json({ message: "Genre already exists" });
    
    const genre = repo.create(req.body);
    await repo.save(genre);
    res.status(201).json(genre);
  } catch (error) {
    console.error("❌ Create genre error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật thể loại (Admin)
exports.updateGenre = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Genre");
    const genre = await repo.findOneBy({ id: req.params.id });
    if (!genre) return res.status(404).json({ message: "Not found" });
    repo.merge(genre, req.body);
    await repo.save(genre);
    res.json(genre);
  } catch (error) {
    console.error("❌ Update genre error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa thể loại (Admin)
exports.deleteGenre = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Genre");
    const result = await repo.delete(req.params.id);
    if (result.affected === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("❌ Delete genre error:", error);
    res.status(500).json({ message: "Server error" });
  }
};