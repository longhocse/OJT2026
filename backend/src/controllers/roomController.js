const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");

exports.getRooms = async (req, res) => {
  const { cinemaId } = req.query;
  const qb = AppDataSource.getRepository("Screen")
    .createQueryBuilder("screen")
    .leftJoinAndSelect("screen.theater", "theater");
  if (cinemaId) qb.andWhere("theater.id = :cinemaId", { cinemaId });
  res.json(await qb.orderBy("screen.name", "ASC").getMany());
};

exports.getRoomById = async (req, res) => {
  const room = await AppDataSource.getRepository("Screen").findOne({
    where: { id: req.params.id },
    relations: ["theater", "seats"],
  });
  if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  res.json(room);
};

exports.createRoom = async (req, res) => {
  const repo = AppDataSource.getRepository("Screen");
  const room = repo.create(res.locals.validated.body);
  await repo.save(room);
  res.status(201).json(room);
};

exports.updateRoom = async (req, res) => {
  const repo = AppDataSource.getRepository("Screen");
  const room = await repo.findOneBy({ id: req.params.id });
  if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  repo.merge(room, res.locals.validated.body);
  await repo.save(room);
  res.json(room);
};

exports.deleteRoom = async (req, res) => {
  const result = await AppDataSource.getRepository("Screen").delete(req.params.id);
  if (result.affected === 0) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  res.json({ message: "Deleted" });
};
