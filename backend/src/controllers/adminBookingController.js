const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { applyRefundSummary, calculateRefund, getRefundRate } = require("../utils/refundPolicy");
const { applyPaymentRefund } = require("../services/paymentLifecycleService");
const { recordAuditLog } = require("../services/auditLogService");

const removeSensitiveFields = (value) => {
  if (Array.isArray(value)) return value.map(removeSensitiveFields);
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  return Object.entries(value).reduce((safe, [key, nested]) => {
    if (key !== "password_hash") safe[key] = removeSensitiveFields(nested);
    return safe;
  }, {});
};

const parseDateStart = (date) => new Date(`${date}T00:00:00.000Z`);
const parseDateEnd = (date) => {
  const end = parseDateStart(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
};

const applyDateRange = (qb, query, field) => {
  if (query.dateFrom)
    qb.andWhere(`${field} >= :dateFrom`, { dateFrom: parseDateStart(query.dateFrom) });
  if (query.dateTo) qb.andWhere(`${field} < :dateTo`, { dateTo: parseDateEnd(query.dateTo) });
  return qb;
};

const bookingRelations = {
  user: true,
  show: { movie: true, screen: { theater: true } },
  bookingSeats: { seat: true },
  payment: true,
};

const loadBooking = (repository, id) =>
  repository.findOne({ where: { id }, relations: bookingRelations });

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

exports.getAdminBookings = async (req, res) => {
  const query = res.locals.validated.query;
  const { page = 1, limit = 20, search, status, paymentStatus, movieId, cinemaId } = query;
  const qb = AppDataSource.getRepository("Booking")
    .createQueryBuilder("booking")
    .leftJoinAndSelect("booking.user", "user")
    .leftJoinAndSelect("booking.show", "show")
    .leftJoinAndSelect("show.movie", "movie")
    .leftJoinAndSelect("show.screen", "screen")
    .leftJoinAndSelect("screen.theater", "theater")
    .leftJoinAndSelect("booking.bookingSeats", "bookingSeat")
    .leftJoinAndSelect("bookingSeat.seat", "seat");

  if (search) {
    qb.andWhere(
      "(user.name LIKE :search OR user.email LIKE :search OR movie.title LIKE :search OR CONVERT(NVARCHAR(36), booking.id) LIKE :search)",
      { search: `%${search}%` },
    );
  }
  if (status) qb.andWhere("booking.status = :status", { status });
  if (paymentStatus) qb.andWhere("booking.payment_status = :paymentStatus", { paymentStatus });
  if (movieId) qb.andWhere("movie.id = :movieId", { movieId });
  if (cinemaId) qb.andWhere("theater.id = :cinemaId", { cinemaId });
  applyDateRange(qb, query, "booking.created_at");

  const [bookings, total] = await qb
    .orderBy("booking.created_at", "DESC")
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  res.json({
    data: removeSensitiveFields(bookings),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.getAdminBookingById = async (req, res) => {
  const booking = await loadBooking(AppDataSource.getRepository("Booking"), req.params.id);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  res.json(removeSensitiveFields(booking));
};

exports.cancelAdminBooking = async (req, res) => {
  const result = await withTransaction(async (manager) => {
    const bookingRepo = manager.getRepository("Booking");
    const bookingSeatRepo = manager.getRepository("BookingSeat");
    const stateRepo = manager.getRepository("ShowSeatState");
    const booking = await bookingRepo.findOne({
      where: { id: req.params.id },
      relations: bookingRelations,
      lock: { mode: "pessimistic_write" },
    });
    if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
    if (booking.status === "cancelled") {
      throw new AppError(409, "BOOKING_ALREADY_CANCELLED", "Booking is already cancelled");
    }
    if (!["pending_payment", "confirmed"].includes(booking.status))
      throw new AppError(409, "BOOKING_NOT_CANCELLABLE", "Booking cannot be cancelled");

    const showTime = new Date(booking.show?.start_time);
    if (Number.isNaN(showTime.getTime()) || showTime <= new Date()) {
      throw new AppError(
        409,
        "SHOW_ALREADY_STARTED",
        "A booking cannot be cancelled after show start",
      );
    }

    const reason = res.locals.validated.body.reason;
    const now = new Date();
    const refundRate = booking.status === "pending_payment" ? 0 : getRefundRate(showTime, now);
    const refundAmount =
      booking.status === "pending_payment"
        ? 0
        : calculateRefund(booking.total_price, showTime, now);
    booking.status = "cancelled";
    booking.cancellation_reason = reason;
    booking.cancelled_at = now;
    applyRefundSummary(booking, refundAmount);
    await applyPaymentRefund(manager, booking, refundAmount);
    await bookingRepo.save(booking);

    for (const bookingSeat of booking.bookingSeats || []) {
      const state = await stateRepo.findOne({
        where: { show: { id: booking.show.id }, seat: { id: bookingSeat.seat.id } },
        relations: { booking: true },
        lock: { mode: "pessimistic_write" },
      });
      if (state && String(state.booking?.id) === String(booking.id)) {
        state.status = "available";
        state.lockedByUser = null;
        state.lock_token = null;
        state.locked_until = null;
        state.booking = null;
        await stateRepo.save(state);
      }
      bookingSeat.status = "cancelled";
    }
    if (booking.bookingSeats?.length) await bookingSeatRepo.save(booking.bookingSeats);
    return { id: booking.id, refundAmount, refundRate };
  });

  const booking = await loadBooking(AppDataSource.getRepository("Booking"), result.id);
  await recordAuditLog(req, {
    action: "booking.cancel",
    resourceType: "Booking",
    resourceId: result.id,
    metadata: {
      reason: res.locals.validated.body.reason,
      refundAmount: result.refundAmount,
      refundRate: result.refundRate,
    },
  });
  res.json({
    message: "Booking cancelled",
    refundAmount: result.refundAmount,
    refundRate: result.refundRate,
    booking: removeSensitiveFields(booking),
  });
};

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

exports.getDashboardStats = async (req, res) => {
  const query = res.locals.validated.query;
  const bookingRepo = AppDataSource.getRepository("Booking");
  const summaryQb = bookingRepo
    .createQueryBuilder("booking")
    .select("COUNT(booking.id)", "totalBookings")
    .addSelect(
      "SUM(CASE WHEN booking.status IN ('confirmed','used') THEN 1 ELSE 0 END)",
      "confirmedBookings",
    )
    .addSelect("SUM(CASE WHEN booking.status = 'cancelled' THEN 1 ELSE 0 END)", "cancelledBookings")
    .addSelect(
      "SUM(CASE WHEN booking.payment_status IN ('paid','partially_refunded','refunded') THEN booking.total_price - booking.refunded_amount ELSE 0 END)",
      "revenue",
    )
    .addSelect("SUM(booking.refunded_amount)", "refund");
  applyDateRange(summaryQb, query, "booking.created_at");
  const summary = await summaryQb.getRawOne();

  const seriesQb = bookingRepo
    .createQueryBuilder("booking")
    .select("CONVERT(date, booking.created_at)", "date")
    .addSelect("COUNT(booking.id)", "totalBookings")
    .addSelect(
      "SUM(CASE WHEN booking.payment_status IN ('paid','partially_refunded','refunded') THEN booking.total_price - booking.refunded_amount ELSE 0 END)",
      "revenue",
    )
    .addSelect("SUM(booking.refunded_amount)", "refund")
    .groupBy("CONVERT(date, booking.created_at)")
    .orderBy("CONVERT(date, booking.created_at)", "ASC");
  applyDateRange(seriesQb, query, "booking.created_at");
  const rawSeries = await seriesQb.getRawMany();

  const bookedSeatQb = AppDataSource.getRepository("BookingSeat")
    .createQueryBuilder("bookingSeat")
    .innerJoin("bookingSeat.booking", "booking")
    .innerJoin("booking.show", "show")
    .select("COUNT(bookingSeat.id)", "bookedSeats")
    .where("booking.status IN (:...occupiedStatuses)", {
      occupiedStatuses: ["confirmed", "used"],
    });
  applyDateRange(bookedSeatQb, query, "show.start_time");
  const bookedSeatResult = await bookedSeatQb.getRawOne();

  const capacityQb = AppDataSource.getRepository("Show")
    .createQueryBuilder("show")
    .innerJoin("show.screen", "screen")
    .select("SUM(screen.total_seats)", "capacity")
    .where("show.status <> :cancelled", { cancelled: "cancelled" });
  applyDateRange(capacityQb, query, "show.start_time");
  const capacityResult = await capacityQb.getRawOne();

  const bookedSeats = numberValue(bookedSeatResult?.bookedSeats);
  const capacity = numberValue(capacityResult?.capacity);
  res.json({
    totalBookings: numberValue(summary?.totalBookings),
    confirmedBookings: numberValue(summary?.confirmedBookings),
    cancelledBookings: numberValue(summary?.cancelledBookings),
    revenue: numberValue(summary?.revenue),
    refund: numberValue(summary?.refund),
    occupancy: capacity > 0 ? Math.round((bookedSeats / capacity) * 10000) / 100 : 0,
    bookedSeats,
    capacity,
    series: rawSeries.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      totalBookings: numberValue(row.totalBookings),
      revenue: numberValue(row.revenue),
      refund: numberValue(row.refund),
    })),
  });
};

exports.removeSensitiveFields = removeSensitiveFields;
