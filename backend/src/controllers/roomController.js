// backend/src/controllers/roomController.js
const { AppDataSource } = require("../config/database");

// Lấy danh sách phòng chiếu
exports.getRooms = async (req, res) => {
  try {
    const { cinemaId } = req.query;
    const repo = AppDataSource.getRepository("Screen");
    const qb = repo.createQueryBuilder("screen")
      .leftJoinAndSelect("screen.theater", "theater");
    
    if (cinemaId) qb.andWhere("screen.theater_id = :cinemaId", { cinemaId });
    
    const rooms = await qb.orderBy("screen.name", "ASC").getMany();
    res.json(rooms);
  } catch (error) {
    console.error("❌ Get rooms error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy chi tiết phòng chiếu
exports.getRoomById = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Screen");
    const room = await repo.findOne({ 
      where: { id: req.params.id },
      relations: ["theater", "seats"]
    });
    if (!room) return res.status(404).json({ message: "Not found" });
    res.json(room);
  } catch (error) {
    console.error("❌ Get room error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Tạo phòng chiếu mới (Admin)
exports.createRoom = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Screen");
    const room = repo.create(req.body);
    await repo.save(room);
    res.status(201).json(room);
  } catch (error) {
    console.error("❌ Create room error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật phòng chiếu (Admin)
exports.updateRoom = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Screen");
    const room = await repo.findOneBy({ id: req.params.id });
    if (!room) return res.status(404).json({ message: "Not found" });
    repo.merge(room, req.body);
    await repo.save(room);
    res.json(room);
  } catch (error) {
    console.error("❌ Update room error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa phòng chiếu (Admin)
exports.deleteRoom = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Screen");
    const result = await repo.delete(req.params.id);
    if (result.affected === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("❌ Delete room error:", error);
    res.status(500).json({ message: "Server error" });
  }
};