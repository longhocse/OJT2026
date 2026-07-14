const { AppDataSource } = require("../config/database");
const { In, MoreThan } = require("typeorm");
const { recordAuditLog } = require("../services/auditLogService");
const { AppError } = require("../utils/AppError");

const seatPosition = (seat) => `${String(seat.row).toUpperCase()}:${Number(seat.number)}`;

const buildLayoutJson = (seats) =>
  JSON.stringify({
    version: 1,
    seats: [...seats]
      .sort((left, right) =>
        left.row === right.row
          ? Number(left.number) - Number(right.number)
          : left.row.localeCompare(right.row),
      )
      .map(({ row, number, type, status }) => ({ row, number, type, status })),
  });

const layoutSignature = (seats) =>
  [...seats]
    .map((seat) => `${seatPosition(seat)}:${seat.type}:${seat.status}`)
    .sort()
    .join("|");

const loadRoom = (id) =>
  AppDataSource.getRepository("Screen").findOne({
    where: { id, is_active: true },
    relations: { theater: true, seats: true },
  });

const saveRoomWithSeats = async ({ roomId, input, user }) => {
  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;
    const roomRepo = queryRunner.manager.getRepository("Screen");
    const seatRepo = queryRunner.manager.getRepository("Seat");
    const theaterRepo = queryRunner.manager.getRepository("Theater");
    const showRepo = queryRunner.manager.getRepository("Show");
    const bookingSeatRepo = queryRunner.manager.getRepository("BookingSeat");

    let theaterId = input.theater.id;

    if (user.role === "manager") {
      theaterId = user.theater_id;
    }

    const theater = await theaterRepo.findOneBy({
      id: theaterId,
      is_active: true,
    });

    if (!theater) {
      throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema not found");
    }

    if (
      user.role === "manager" &&
      String(theater.id) !== String(user.theater_id)
    ) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You can only manage rooms in your theater"
      );
    }

    let room;
    let existingSeats = [];
    if (roomId) {
      room = await roomRepo.findOne({
        where: { id: roomId, is_active: true },
        relations: { seats: true, theater: true },
        lock: { mode: "pessimistic_write" },
      });
      if (
        user.role === "manager" &&
        String(room.theater.id) !== String(user.theater_id)
      ) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "You can only manage rooms in your theater"
        );
      }
      if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
      existingSeats = room.seats || [];
    } else {
      room = roomRepo.create();
    }

    const layoutChanged = roomId && layoutSignature(existingSeats) !== layoutSignature(input.seats);
    if (layoutChanged) {
      const futureShows = await showRepo.count({
        where: { screen: { id: roomId }, start_time: MoreThan(new Date()) },
      });
      if (futureShows > 0) {
        throw new AppError(
          409,
          "ROOM_LAYOUT_HAS_FUTURE_SHOWS",
          "Seat layout cannot be changed while the room has future shows",
        );
      }
    }

    const existingById = new Map(
      existingSeats.map((seat) => [String(seat.id).toLowerCase(), seat]),
    );
    const existingByPosition = new Map(existingSeats.map((seat) => [seatPosition(seat), seat]));
    const retainedIds = new Set();
    const affectedSeatIds = [];
    const nextSeats = [];

    for (const seatInput of input.seats) {
      let seat = seatInput.id
        ? existingById.get(String(seatInput.id).toLowerCase())
        : existingByPosition.get(seatPosition(seatInput));
      if (seatInput.id && !seat) {
        throw new AppError(400, "SEAT_NOT_IN_ROOM", "A seat does not belong to this room");
      }

      if (seat) {
        retainedIds.add(String(seat.id).toLowerCase());
        if (
          seatPosition(seat) !== seatPosition(seatInput) ||
          seat.type !== seatInput.type ||
          seat.status !== seatInput.status
        ) {
          affectedSeatIds.push(seat.id);
        }
        seat.row = seatInput.row;
        seat.number = seatInput.number;
        seat.type = seatInput.type;
        seat.status = seatInput.status;
      } else {
        seat = seatRepo.create({ ...seatInput, screen: room });
      }
      nextSeats.push(seat);
    }

    const removedSeats = existingSeats.filter(
      (seat) => !retainedIds.has(String(seat.id).toLowerCase()),
    );
    affectedSeatIds.push(...removedSeats.map((seat) => seat.id));
    if (affectedSeatIds.length > 0) {
      const referencedSeats = await bookingSeatRepo.count({
        where: { seat: { id: In(affectedSeatIds) } },
      });
      if (referencedSeats > 0) {
        throw new AppError(409, "SEAT_HAS_BOOKINGS", "Booked seats cannot be changed or removed");
      }
    }

    room.name = input.name;
    room.theater = theater;
    room.total_seats = nextSeats.length;
    room.layout_json = buildLayoutJson(input.seats);
    await roomRepo.save(room);

    for (const seat of nextSeats) seat.screen = room;
    if (removedSeats.length > 0) await seatRepo.remove(removedSeats);
    await seatRepo.save(nextSeats);

    await queryRunner.commitTransaction();
    transactionStarted = false;
    return room.id;
  } catch (error) {
    if (transactionStarted) await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

exports.getRooms = async (req, res) => {
  console.log("ROLE =", req.user?.role);
  console.log("THEATER =", req.user?.theater_id);
  const { cinemaId } = req.query;
  const qb = AppDataSource.getRepository("Screen")
    .createQueryBuilder("screen")
    .leftJoinAndSelect("screen.theater", "theater")
    .where("screen.is_active = :active", { active: true })
    .andWhere("theater.is_active = :active", { active: true });

  if (cinemaId) {
    qb.andWhere("theater.id = :cinemaId", {
      cinemaId,
    });
  }

  if (req.user?.role === "manager") {
    qb.andWhere("theater.id = :theaterId", {
      theaterId: req.user.theater_id,
    });
  }

  res.json(await qb.orderBy("screen.name", "ASC").getMany());
};

exports.getRoomById = async (req, res) => {
  const room = await loadRoom(req.params.id);

  if (!room) {
    throw new AppError(
      404,
      "ROOM_NOT_FOUND",
      "Room not found"
    );
  }

  if (
    req.user?.role === "manager" &&
    String(room.theater.id) !== String(req.user.theater_id)
  ) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only view rooms in your theater"
    );
  }

  res.json(room);
};

exports.createRoom = async (req, res) => {
  const roomId = await saveRoomWithSeats({
    input: res.locals.validated.body,
    user: req.user,
  });
  await recordAuditLog(req, {
    action: "room.create",
    resourceType: "Screen",
    resourceId: roomId,
    metadata: { seatCount: res.locals.validated.body.seats.length },
  });
  res.status(201).json(await loadRoom(roomId));
};

exports.updateRoom = async (req, res) => {
  const roomId = await saveRoomWithSeats({
    roomId: req.params.id,
    input: res.locals.validated.body,
    user: req.user,
  });
  await recordAuditLog(req, {
    action: "room.update",
    resourceType: "Screen",
    resourceId: roomId,
    metadata: { seatCount: res.locals.validated.body.seats.length },
  });
  res.json(await loadRoom(roomId));
};

exports.deleteRoom = async (req, res) => {
  const showCount = await AppDataSource.getRepository("Show").count({
    where: { screen: { id: req.params.id } },
  });
  const roomRepo = AppDataSource.getRepository("Screen");
  const room = await roomRepo.findOne({
    where: { id: req.params.id },
    relations: {
      seats: true,
      theater: true,
    },
  });

  if (!room) {
    throw new AppError(
      404,
      "ROOM_NOT_FOUND",
      "Room not found"
    );
  }

  if (
    req.user.role === "manager" &&
    String(room.theater.id) !== String(req.user.theater_id)
  ) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only delete rooms in your theater"
    );
  }

  if (showCount > 0) {
    room.is_active = false;
    await roomRepo.save(room);
    await recordAuditLog(req, {
      action: "room.deactivate",
      resourceType: "Screen",
      resourceId: room.id,
      metadata: { reason: "referenced_resource", showCount },
    });
    return res.json({
      code: "ROOM_IN_USE_DEACTIVATED",
      message: "Room has shows and was deactivated instead of deleted",
    });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;
    if (room.seats?.length) {
      await queryRunner.manager.getRepository("Seat").remove(room.seats);
    }
    await queryRunner.manager.getRepository("Screen").remove(room);
    await queryRunner.commitTransaction();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
  await recordAuditLog(req, {
    action: "room.delete",
    resourceType: "Screen",
    resourceId: room.id,
  });
  return res.json({ message: "Deleted" });
};
