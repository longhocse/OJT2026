// backend/src/controllers/cinemaController.js
const { AppDataSource } = require("../config/database");

// Lấy danh sách rạp
exports.getCinemas = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Theater");
    const cinemas = await repo.find({ 
      order: { name: "ASC" },
      relations: ["screens"]
    });
    res.json(cinemas);
  } catch (error) {
    console.error("❌ Get cinemas error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy chi tiết rạp
exports.getCinemaById = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Theater");
    const cinema = await repo.findOne({ 
      where: { id: req.params.id },
      relations: ["screens"]
    });
    if (!cinema) return res.status(404).json({ message: "Not found" });
    res.json(cinema);
  } catch (error) {
    console.error("❌ Get cinema error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Tạo rạp mới (Admin)
exports.createCinema = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Theater");
    const cinema = repo.create(req.body);
    await repo.save(cinema);
    res.status(201).json(cinema);
  } catch (error) {
    console.error("❌ Create cinema error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật rạp (Admin)
exports.updateCinema = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Theater");
    const cinema = await repo.findOneBy({ id: req.params.id });
    if (!cinema) return res.status(404).json({ message: "Not found" });
    repo.merge(cinema, req.body);
    await repo.save(cinema);
    res.json(cinema);
  } catch (error) {
    console.error("❌ Update cinema error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa rạp (Admin)
exports.deleteCinema = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Theater");
    const result = await repo.delete(req.params.id);
    if (result.affected === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("❌ Delete cinema error:", error);
    res.status(500).json({ message: "Server error" });
  }
};