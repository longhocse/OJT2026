const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const { applyRefundSummary } = require("../utils/refundPolicy");
const { applyPaymentRefund } = require("../services/paymentLifecycleService");
const { recordAuditLog } = require("../services/auditLogService");
const {
  applyTheaterScope,
  assertScreenAccess,
  assertShowAccess,
} = require("../services/accessControlService");

const effectiveStatus = (show, now = new Date()) => {
  if (show.status === "cancelled") return "cancelled";
  if (new Date(show.end_time) <= now) return "completed";
  if (new Date(show.start_time) <= now) return "in_progress";
  return "scheduled";
};

const serializeShow = (show) => ({ ...show, status: effectiveStatus(show) });

const loadShow = (repository, id) =>
  repository.findOne({
    where: { id },
    relations: { movie: true, screen: { theater: true } },
  });

const dateRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const dateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const datesBetween = (dateFrom, dateTo, weekdays) => {
  const allowed = new Set(weekdays.map(Number));
  const current = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  const result = [];
  while (current <= end) {
    if (allowed.has(current.getDay())) result.push(dateOnly(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
};

const showDateTime = (date, time) => new Date(`${date}T${time}:00`);

const applyShowFilters = (qb, query, { admin = false } = {}) => {
  const { movieId, theaterId, screenId, date, status } = query;
  if (movieId) qb.andWhere("movie.id = :movieId", { movieId });
  if (theaterId) qb.andWhere("theater.id = :theaterId", { theaterId });
  if (screenId) qb.andWhere("screen.id = :screenId", { screenId });
  if (date) {
    const { start, end } = dateRange(date);
    qb.andWhere("show.start_time >= :start AND show.start_time < :end", { start, end });
  }

  if (!admin) qb.andWhere("show.status = :publicStatus", { publicStatus: "scheduled" });
  if (admin && status === "cancelled") {
    qb.andWhere("show.status = :cancelled", { cancelled: "cancelled" });
  } else if (admin && status === "completed") {
    qb.andWhere("show.status = :scheduled AND show.end_time < :now", {
      scheduled: "scheduled",
      now: new Date(),
    });
  } else if (admin && status === "in_progress") {
    qb.andWhere("show.status = :scheduled AND show.start_time <= :now AND show.end_time > :now", {
      scheduled: "scheduled",
      now: new Date(),
    });
  } else if (admin && status === "scheduled") {
    qb.andWhere("show.status = :scheduled AND show.start_time > :now", {
      scheduled: "scheduled",
      now: new Date(),
    });
  }
  return qb;
};

const findScheduleConflict = async (showRepo, input, excludeId) => {
  const bufferMs = env.SHOW_CLEANING_BUFFER_MINUTES * 60 * 1000;
  const blockedFrom = new Date(input.start_time.getTime() - bufferMs);
  const blockedUntil = new Date(input.end_time.getTime() + bufferMs);
  const qb = showRepo
    .createQueryBuilder("show")
    .innerJoin("show.screen", "screen")
    .where("screen.id = :screenId", { screenId: input.screen.id })
    .andWhere("show.status = :status", { status: "scheduled" })
    .andWhere("show.start_time < :blockedUntil", { blockedUntil })
    .andWhere("show.end_time > :blockedFrom", { blockedFrom })
    .setLock("pessimistic_write");
  if (excludeId) qb.andWhere("show.id <> :excludeId", { excludeId });
  return qb.getOne();
};

const validateSchedule = async (manager, input, excludeId) => {
  const movie = await manager
    .getRepository("Movie")
    .findOneBy({ id: input.movie.id, is_active: true });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");

  const screen = await manager.getRepository("Screen").findOneBy({
    id: input.screen.id,
    is_active: true,
  });
  if (!screen) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  if (screen.total_seats < 1) {
    throw new AppError(409, "ROOM_HAS_NO_SEATS", "Room must have seats before scheduling a show");
  }

  if (input.start_time <= new Date()) {
    throw new AppError(409, "SHOW_IN_PAST", "A show cannot start in the past");
  }
  const durationMs = input.end_time.getTime() - input.start_time.getTime();
  if (Math.abs(durationMs - movie.duration * 60 * 1000) > 1000) {
    throw new AppError(
      400,
      "SHOW_DURATION_MISMATCH",
      `Show duration must be exactly ${movie.duration} minutes`,
    );
  }

  if (await findScheduleConflict(manager.getRepository("Show"), input, excludeId)) {
    throw new AppError(
      409,
      "SHOW_SCHEDULE_CONFLICT",
      `Room requires a ${env.SHOW_CLEANING_BUFFER_MINUTES}-minute cleaning buffer between shows`,
    );
  }
  return { movie, screen };
};

const withTransaction = async (work) => {
  const queryRunner = AppDataSource.createQueryRunner();
  let started = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    started = true;
    const result = await work(queryRunner.manager);
    await queryRunner.commitTransaction();
    started = false;
    return result;
  } catch (error) {
    if (started) await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

exports.getShows = async (req, res) => {
  const query = res.locals.validated?.query || req.query;
  const qb = AppDataSource.getRepository("Show")
    .createQueryBuilder("show")
    .leftJoinAndSelect("show.movie", "movie")
    .leftJoinAndSelect("show.screen", "screen")
    .leftJoinAndSelect("screen.theater", "theater");
  applyShowFilters(qb, query);
  res.json((await qb.orderBy("show.start_time", "ASC").getMany()).map(serializeShow));
};

exports.getAdminShows = async (req, res) => {
  const query = res.locals.validated?.query || req.query;
  const { page = 1, limit = 20 } = query;
  const qb = AppDataSource.getRepository("Show")
    .createQueryBuilder("show")
    .leftJoinAndSelect("show.movie", "movie")
    .leftJoinAndSelect("show.screen", "screen")
    .leftJoinAndSelect("screen.theater", "theater");
  applyShowFilters(qb, query, { admin: true });
  applyTheaterScope(qb, req, "theater");
  const [shows, total] = await qb
    .orderBy("show.start_time", "DESC")
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  res.json({
    data: shows.map(serializeShow),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.getShowById = async (req, res) => {
  const show = await loadShow(AppDataSource.getRepository("Show"), req.params.id);
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");

  const occupied = await AppDataSource.getRepository("ShowSeatState").count({
    where: { show: { id: show.id }, status: "booked" },
  });
  const disabled = await AppDataSource.getRepository("Seat").count({
    where: { screen: { id: show.screen.id }, status: "disabled" },
  });
  res.json({
    ...serializeShow(show),
    availableSeats: Math.max(0, show.screen.total_seats - occupied - disabled),
  });
};

exports.getAdminShowById = async (req, res) => {
  const show = await loadShow(AppDataSource.getRepository("Show"), req.params.id);
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
  await assertShowAccess(AppDataSource.manager, req, req.params.id);
  res.json(serializeShow(show));
};

exports.getSeatsByShow = async (req, res) => {
  const { showId } = req.params;
  const show = await AppDataSource.getRepository("Show").findOne({
    where: { id: showId },
    relations: { screen: { seats: true } },
  });
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
  if (show.status === "cancelled") {
    throw new AppError(409, "SHOW_CANCELLED", "Cancelled shows do not have bookable seats");
  }

  const states = await AppDataSource.getRepository("ShowSeatState").find({
    where: { show: { id: showId } },
    relations: { seat: true },
  });
  const stateBySeatId = new Map(states.map((state) => [String(state.seat.id), state]));
  const now = new Date();
  const seats = show.screen.seats.map((seat) => {
    const state = stateBySeatId.get(String(seat.id));
    let status = "available";
    if (seat.status === "disabled") status = "disabled";
    else if (state?.status === "booked") status = "occupied";
    else if (state?.status === "locked" && new Date(state.locked_until) > now) status = "locked";
    return { ...seat, status };
  });
  res.json(seats);
};

exports.createShow = async (req, res) => {
  const showId = await withTransaction(async (manager) => {
    const input = res.locals.validated.body;
    await assertScreenAccess(manager, req, input.screen.id);
    const { movie, screen } = await validateSchedule(manager, input);
    const showRepo = manager.getRepository("Show");
    const show = showRepo.create({
      ...input,
      movie,
      screen,
      status: "scheduled",
      cancellation_reason: null,
      cancelled_at: null,
    });
    await showRepo.save(show);
    return show.id;
  });
  const show = await loadShow(AppDataSource.getRepository("Show"), showId);
  await recordAuditLog(req, {
    action: "show.create",
    resourceType: "Show",
    resourceId: showId,
    metadata: { movieId: show.movie?.id, screenId: show.screen?.id },
  });
  res.status(201).json(serializeShow(show));
};

exports.createBulkShows = async (req, res) => {
  const input = res.locals.validated.body;
  const result = await withTransaction(async (manager) => {
    await assertScreenAccess(manager, req, input.screen.id);
    const movie = await manager
      .getRepository("Movie")
      .findOneBy({ id: input.movie.id, is_active: true });
    if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie not found");

    const screen = await manager.getRepository("Screen").findOneBy({
      id: input.screen.id,
      is_active: true,
    });
    if (!screen) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
    if (screen.total_seats < 1) {
      throw new AppError(409, "ROOM_HAS_NO_SEATS", "Room must have seats before scheduling a show");
    }

    const showRepo = manager.getRepository("Show");
    const created = [];
    const skipped = [];
    const dates = datesBetween(input.dateFrom, input.dateTo, input.weekdays);

    for (const date of dates) {
      for (const time of input.startTimes) {
        const start_time = showDateTime(date, time);
        const end_time = new Date(start_time.getTime() + movie.duration * 60 * 1000);
        const showInput = {
          movie: { id: movie.id },
          screen: { id: screen.id },
          start_time,
          end_time,
          price: input.price,
        };

        try {
          await validateSchedule(manager, showInput);
          const show = showRepo.create({
            start_time,
            end_time,
            price: input.price,
            movie,
            screen,
            status: "scheduled",
            cancellation_reason: null,
            cancelled_at: null,
          });
          await showRepo.save(show);
          created.push(show);
        } catch (error) {
          const item = {
            date,
            time,
            code: error.code || "SHOW_BULK_ITEM_INVALID",
            message: error.message || "Show cannot be created",
          };
          if (input.conflictMode === "skip" && error instanceof AppError) {
            skipped.push(item);
            continue;
          }
          error.details = item;
          throw error;
        }
      }
    }

    return { created, skipped, requested: dates.length * input.startTimes.length };
  });

  await recordAuditLog(req, {
    action: "show.bulk_create",
    resourceType: "Show",
    resourceId: null,
    metadata: {
      movieId: input.movie.id,
      screenId: input.screen.id,
      requested: result.requested,
      created: result.created.length,
      skipped: result.skipped.length,
    },
  });

  res.status(201).json({
    requested: result.requested,
    created: result.created.length,
    skipped: result.skipped.length,
    conflicts: result.skipped,
    shows: result.created.map(serializeShow),
  });
};

exports.updateShow = async (req, res) => {
  const showId = await withTransaction(async (manager) => {
    const showRepo = manager.getRepository("Show");
    const show = await showRepo.findOne({
      where: { id: req.params.id },
      lock: { mode: "pessimistic_write" },
    });
    if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
    if (show.status === "cancelled") {
      throw new AppError(409, "SHOW_CANCELLED", "A cancelled show cannot be edited");
    }
    if (new Date(show.start_time) <= new Date()) {
      throw new AppError(409, "SHOW_ALREADY_STARTED", "A started show cannot be edited");
    }
    if ((await manager.getRepository("Booking").count({ where: { show: { id: show.id } } })) > 0) {
      throw new AppError(409, "SHOW_HAS_BOOKINGS", "A show with bookings cannot be edited");
    }
    await assertShowAccess(manager, req, show.id);

    const input = res.locals.validated.body;
    await assertScreenAccess(manager, req, input.screen.id);
    const { movie, screen } = await validateSchedule(manager, input, show.id);
    Object.assign(show, input, { movie, screen });
    await showRepo.save(show);
    return show.id;
  });
  await recordAuditLog(req, {
    action: "show.update",
    resourceType: "Show",
    resourceId: showId,
  });
  res.json(serializeShow(await loadShow(AppDataSource.getRepository("Show"), showId)));
};

exports.cancelShow = async (req, res) => {
  const showId = await withTransaction(async (manager) => {
    const showRepo = manager.getRepository("Show");
    const show = await showRepo.findOne({
      where: { id: req.params.id },
      lock: { mode: "pessimistic_write" },
    });
    if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
    await assertShowAccess(manager, req, show.id);
    if (show.status === "cancelled") {
      throw new AppError(409, "SHOW_ALREADY_CANCELLED", "Show is already cancelled");
    }
    if (new Date(show.start_time) <= new Date()) {
      throw new AppError(409, "SHOW_ALREADY_STARTED", "A started show cannot be cancelled");
    }

    const now = new Date();
    const reason = res.locals.validated.body.reason;
    show.status = "cancelled";
    show.cancellation_reason = reason;
    show.cancelled_at = now;
    await showRepo.save(show);

    const bookingRepo = manager.getRepository("Booking");
    const bookingSeatRepo = manager.getRepository("BookingSeat");
    const bookings = await bookingRepo.find({
      where: { show: { id: show.id } },
      relations: { bookingSeats: true },
    });
    const bookingSeats = [];
    for (const booking of bookings) {
      const refundAmount = booking.status === "confirmed" ? booking.total_price : 0;
      if (booking.status !== "cancelled") {
        booking.status = "cancelled";
        booking.cancellation_reason = reason;
        booking.cancelled_at = now;
        applyRefundSummary(booking, refundAmount);
        await applyPaymentRefund(manager, booking, refundAmount);
      }
      for (const bookingSeat of booking.bookingSeats || []) {
        bookingSeat.status = "cancelled";
        bookingSeats.push(bookingSeat);
      }
    }
    if (bookings.length > 0) await bookingRepo.save(bookings);
    if (bookingSeats.length > 0) await bookingSeatRepo.save(bookingSeats);

    const stateRepo = manager.getRepository("ShowSeatState");
    const states = await stateRepo.find({ where: { show: { id: show.id } } });
    for (const state of states) {
      state.status = "available";
      state.lockedByUser = null;
      state.lock_token = null;
      state.locked_until = null;
      state.booking = null;
    }
    if (states.length > 0) await stateRepo.save(states);
    return show.id;
  });
  await recordAuditLog(req, {
    action: "show.cancel",
    resourceType: "Show",
    resourceId: showId,
    metadata: { reason: res.locals.validated.body.reason },
  });
  res.json({
    message: "Show cancelled",
    show: serializeShow(await loadShow(AppDataSource.getRepository("Show"), showId)),
  });
};

exports.deleteShow = async (req, res) => {
  let deletedShowId = req.params.id;
  await withTransaction(async (manager) => {
    const showRepo = manager.getRepository("Show");
    const show = await showRepo.findOne({
      where: { id: req.params.id },
      lock: { mode: "pessimistic_write" },
    });
    if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
    await assertShowAccess(manager, req, show.id);
    if (new Date(show.start_time) <= new Date()) {
      throw new AppError(409, "SHOW_ALREADY_STARTED", "A started show cannot be deleted");
    }
    if ((await manager.getRepository("Booking").count({ where: { show: { id: show.id } } })) > 0) {
      throw new AppError(409, "SHOW_HAS_BOOKINGS", "A show with bookings must be cancelled");
    }
    const stateRepo = manager.getRepository("ShowSeatState");
    const states = await stateRepo.find({ where: { show: { id: show.id } } });
    if (states.length > 0) await stateRepo.remove(states);
    await showRepo.remove(show);
    deletedShowId = show.id;
  });
  await recordAuditLog(req, {
    action: "show.delete",
    resourceType: "Show",
    resourceId: deletedShowId,
  });
  res.json({ message: "Deleted" });
};
