// backend/src/controllers/bookingController.js
const { AppDataSource } = require("../config/database");
const { In } = require("typeorm");
const { randomUUID } = require("node:crypto");
const { AppError } = require("../utils/AppError");
const logger = require("../utils/logger");
const { applyRefundSummary, calculateRefund } = require("../utils/refundPolicy");
const { getProviderForMethod } = require("../payments/providerRegistry");
const { env } = require("../config/env");
const { applyPaymentRefund } = require("../services/paymentLifecycleService");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class BookingRequestError extends AppError {
  constructor(status, message) {
    super(status, "BOOKING_REQUEST_ERROR", message);
  }
}

const findSeatStateForUpdate = (repository, showId, seatId) =>
  repository.findOne({
    where: {
      show: { id: showId },
      seat: { id: seatId },
    },
    relations: {
      show: true,
      seat: true,
      lockedByUser: true,
      booking: true,
    },
    lock: { mode: "pessimistic_write" },
  });

const setStateAvailable = (state) => {
  state.status = "available";
  state.lockedByUser = null;
  state.lock_token = null;
  state.locked_until = null;
  state.booking = null;
};

const saveWithRepository = (manager, repository, entity) =>
  typeof repository?.save === "function" ? repository.save(entity) : manager.save(entity);

const getRepositoryOrNull = (manager, name) => {
  try {
    return manager.getRepository(name);
  } catch (_error) {
    return null;
  }
};

const rollbackQuietly = async (queryRunner, context) => {
  try {
    await queryRunner.rollbackTransaction();
  } catch (error) {
    logger.error("transaction_rollback_failed", { context, error });
  }
};

const releaseQuietly = async (queryRunner, context) => {
  try {
    await queryRunner.release();
  } catch (error) {
    logger.error("query_runner_release_failed", { context, error });
  }
};

const normalizeShowSeatRequest = (body) => {
  const { showId, seatIds } = body ?? {};
  if (typeof showId !== "string" || !UUID_PATTERN.test(showId)) {
    throw new BookingRequestError(400, "showId must be a valid UUID");
  }
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new BookingRequestError(400, "seatIds must be a non-empty array");
  }
  if (seatIds.some((seatId) => typeof seatId !== "string" || !UUID_PATTERN.test(seatId))) {
    throw new BookingRequestError(400, "Every seatId must be a valid UUID");
  }

  const normalizedSeatIds = seatIds.map((seatId) => seatId.toLowerCase());
  if (new Set(normalizedSeatIds).size !== normalizedSeatIds.length) {
    throw new BookingRequestError(400, "seatIds must not contain duplicates");
  }
  return { showId, seatIds: normalizedSeatIds };
};

const normalizeBookingError = (error) => {
  const sqlErrorNumber = error?.number ?? error?.originalError?.info?.number;
  if (sqlErrorNumber === 2601 || sqlErrorNumber === 2627) {
    return new AppError(409, "SEAT_UNAVAILABLE", "One or more seats are no longer available");
  }
  return error;
};

const isAdmin = (user) => user?.role === "admin";

const ownsBooking = (booking, user) =>
  booking?.user?.id != null && user?.id != null && String(booking.user.id) === String(user.id);

const sanitizeBooking = (booking) => {
  if (!booking?.user) return booking;

  const { password_hash, ...safeUser } = booking.user;
  return { ...booking, user: safeUser };
};

const findBookingsForUser = async (userId) => {
  const repo = AppDataSource.getRepository("Booking");
  return repo.find({
    where: { user: { id: userId } },
    relations: {
      show: {
        movie: true,
      },
      bookingSeats: {
        seat: true,
      },
      payment: true,
    },
    order: { created_at: "DESC" },
  });
};

exports.createBooking = async (req, res, next) => {
  const { showId, seatIds, paymentMethod, lockToken } = res.locals.validated.body;
  const uniqueSeatIds = [...new Set(seatIds.map((seatId) => seatId.toLowerCase()))];

  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;

    const userId = req.user.id;
    const showRepo = queryRunner.manager.getRepository("Show");
    const seatRepo = queryRunner.manager.getRepository("Seat");
    const bookingRepo = queryRunner.manager.getRepository("Booking");
    const bookingSeatRepo = queryRunner.manager.getRepository("BookingSeat");
    const seatStateRepo = queryRunner.manager.getRepository("ShowSeatState");
    const paymentRepo = queryRunner.manager.getRepository("Payment");

    const show = await showRepo.findOne({
      where: { id: showId },
      relations: {
        movie: true,
        screen: true,
      },
    });
    if (!show) throw new BookingRequestError(404, "Show not found");
    if (show.status === "cancelled") {
      throw new BookingRequestError(409, "Cannot book a cancelled show");
    }

    const startTime = new Date(show.start_time);
    if (Number.isNaN(startTime.getTime()) || startTime <= new Date()) {
      throw new BookingRequestError(409, "Cannot book a show that has already started");
    }

    const seats = await seatRepo.find({
      where: { id: In(uniqueSeatIds) },
      relations: { screen: true },
    });
    if (seats.length !== uniqueSeatIds.length) {
      throw new BookingRequestError(404, "One or more seats were not found");
    }
    if (seats.some((seat) => String(seat.screen?.id) !== String(show.screen?.id))) {
      throw new BookingRequestError(400, "All seats must belong to the show's screen");
    }
    if (seats.some((seat) => seat.status === "disabled")) {
      throw new BookingRequestError(409, "Disabled seats cannot be booked");
    }

    const stateBySeatId = new Map();
    for (const seat of seats) {
      const state = await findSeatStateForUpdate(seatStateRepo, showId, seat.id);
      if (!state || state.status !== "locked" || new Date(state.locked_until) <= new Date()) {
        throw new BookingRequestError(409, `Seat ${seat.row}${seat.number} is not actively locked`);
      }
      if (
        String(state.lockedByUser?.id) !== String(userId) ||
        String(state.lock_token).toLowerCase() !== lockToken.toLowerCase()
      ) {
        throw new BookingRequestError(403, "Only the lock owner can complete this booking");
      }
      stateBySeatId.set(String(seat.id).toLowerCase(), state);
    }

    const basePrice = parseFloat(show.price);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      throw new BookingRequestError(409, "Show price must be greater than zero");
    }

    let totalPrice = 0;
    for (const seat of seats) {
      let price = basePrice;
      if (seat.type === "vip") price *= 1.5;
      if (seat.type === "couple") price *= 1.8;
      totalPrice += price;
    }
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new BookingRequestError(409, "Booking total must be greater than zero");
    }

    const booking = bookingRepo.create({
      user: { id: userId },
      show: { id: showId },
      total_price: totalPrice,
      status: "pending_payment",
      payment_method: paymentMethod,
      payment_status: "pending",
      refunded_amount: 0,
      expires_at: new Date(
        Date.now() +
          (paymentMethod === "cash"
            ? env.CASH_PAYMENT_TTL_MINUTES
            : env.PAYMENT_PENDING_TTL_MINUTES) *
            60000,
      ),
      ticket_code: `MT-${randomUUID().replaceAll("-", "").toUpperCase()}`,
    });
    await saveWithRepository(queryRunner.manager, bookingRepo, booking);

    for (const seat of seats) {
      let price = basePrice;
      if (seat.type === "vip") price *= 1.5;
      if (seat.type === "couple") price *= 1.8;
      const bookingSeat = bookingSeatRepo.create({
        booking,
        seat,
        price,
        status: "confirmed",
      });
      await saveWithRepository(queryRunner.manager, bookingSeatRepo, bookingSeat);

      const state = stateBySeatId.get(String(seat.id).toLowerCase());
      state.status = "booked";
      state.booking = booking;
      state.lockedByUser = null;
      state.lock_token = null;
      state.locked_until = null;
      await saveWithRepository(queryRunner.manager, seatStateRepo, state);
    }

    const provider = getProviderForMethod(paymentMethod);
    const payment = paymentRepo.create({
      booking,
      provider: paymentMethod === "cash" ? "cash" : "mock",
      amount: totalPrice,
      status: "pending",
      idempotency_key: randomUUID(),
      refunded_amount: 0,
    });
    await paymentRepo.save(payment);
    const intent = await provider.createIntent({ paymentId: payment.id, amount: totalPrice });
    payment.provider = intent.provider;
    payment.provider_transaction_id = intent.transactionId;
    await paymentRepo.save(payment);

    await queryRunner.commitTransaction();
    transactionStarted = false;
    res.status(201).json({
      message: "Booking created",
      bookingId: booking.id,
      totalPrice,
      seats: seats.map((s) => `${String(s.row).trim()}${s.number}`),
      status: booking.status,
      expiresAt: booking.expires_at,
      ticketCode: booking.ticket_code,
      payment: {
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        checkoutUrl: intent.checkoutUrl,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError) {
        logger.error("transaction_rollback_failed", {
          context: "create_booking",
          error: rollbackError,
        });
      }
    }
    return next(normalizeBookingError(error));
  } finally {
    try {
      await queryRunner.release();
    } catch (releaseError) {
      logger.error("query_runner_release_failed", {
        context: "create_booking",
        error: releaseError,
      });
    }
  }
};

// SỬA: Dùng object syntax cho relations
exports.getBookingById = async (req, res) => {
  const booking = await AppDataSource.getRepository("Booking").findOne({
    where: { id: req.params.id },
    relations: {
      user: true,
      show: {
        movie: true,
        screen: {
          theater: true,
        },
      },
      bookingSeats: {
        seat: true,
      },
      payment: true,
    },
  });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  if (!isAdmin(req.user) && !ownsBooking(booking, req.user)) {
    throw new AppError(403, "BOOKING_FORBIDDEN", "Forbidden");
  }

  res.json(sanitizeBooking(booking));
};

// SỬA: Dùng object syntax cho relations
exports.getUserBookings = async (req, res) => {
  const requestedUserId = req.params.userId;
  if (!isAdmin(req.user) && String(requestedUserId) !== String(req.user.id)) {
    throw new AppError(403, "BOOKING_FORBIDDEN", "Forbidden");
  }

  const bookings = await findBookingsForUser(isAdmin(req.user) ? requestedUserId : req.user.id);
  res.json(bookings.map(sanitizeBooking));
};

exports.getMyBookings = async (req, res) => {
  const bookings = await findBookingsForUser(req.user.id);
  res.json(bookings.map(sanitizeBooking));
};

exports.cancelBooking = async (req, res, next) => {
  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;

    const repo = queryRunner.manager.getRepository("Booking");
    const seatStateRepo = queryRunner.manager.getRepository("ShowSeatState");
    const booking = await repo.findOne({
      where: { id: req.params.id },
      relations: {
        user: true,
        show: true,
        bookingSeats: {
          seat: true,
        },
      },
      lock: { mode: "pessimistic_write" },
    });
    if (!booking) throw new BookingRequestError(404, "Not found");
    if (!isAdmin(req.user) && !ownsBooking(booking, req.user)) {
      throw new BookingRequestError(403, "Forbidden");
    }
    if (booking.status === "cancelled") {
      throw new BookingRequestError(409, "Booking is already cancelled");
    }
    if (!["pending_payment", "confirmed"].includes(booking.status))
      throw new BookingRequestError(409, "Booking cannot be cancelled in its current status");

    const showTime = new Date(booking.show.start_time);
    const hoursDiff = (showTime - new Date()) / (1000 * 60 * 60);
    if (hoursDiff < 2) {
      throw new BookingRequestError(400, "Cannot cancel within 2 hours");
    }

    const refundAmount =
      booking.status === "pending_payment" ? 0 : calculateRefund(booking.total_price, showTime);
    booking.status = "cancelled";
    booking.cancellation_reason = isAdmin(req.user)
      ? "Cancelled by administrator"
      : "Cancelled by customer";
    booking.cancelled_at = new Date();
    applyRefundSummary(booking, refundAmount);
    await applyPaymentRefund(queryRunner.manager, booking, refundAmount);
    await saveWithRepository(queryRunner.manager, repo, booking);

    for (const bs of booking.bookingSeats) {
      const state = await findSeatStateForUpdate(seatStateRepo, booking.show.id, bs.seat.id);
      if (state && state.status === "booked" && String(state.booking?.id) === String(booking.id)) {
        setStateAvailable(state);
        await saveWithRepository(queryRunner.manager, seatStateRepo, state);
      }

      bs.status = "cancelled";
      await saveWithRepository(
        queryRunner.manager,
        getRepositoryOrNull(queryRunner.manager, "BookingSeat"),
        bs,
      );
    }
    await queryRunner.commitTransaction();
    transactionStarted = false;
    return res.json({
      message: "Cancelled",
      refundAmount,
      paymentStatus: booking.payment_status,
    });
  } catch (error) {
    if (transactionStarted) await rollbackQuietly(queryRunner, "Cancel booking");
    return next(normalizeBookingError(error));
  } finally {
    await releaseQuietly(queryRunner, "Cancel booking");
  }
};

exports.lockSeats = async (req, res, next) => {
  let input;
  try {
    input = normalizeShowSeatRequest(req.body);
  } catch (error) {
    return next(normalizeBookingError(error));
  }

  const duration = req.body.duration ?? 600;
  if (!Number.isInteger(duration) || duration < 30 || duration > 900) {
    return next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "duration must be an integer between 30 and 900 seconds",
      ),
    );
  }

  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;

    const showRepo = queryRunner.manager.getRepository("Show");
    const seatRepo = queryRunner.manager.getRepository("Seat");
    const stateRepo = queryRunner.manager.getRepository("ShowSeatState");
    const show = await showRepo.findOne({
      where: { id: input.showId },
      relations: { screen: true },
    });
    if (!show) throw new BookingRequestError(404, "Show not found");
    if (show.status === "cancelled") {
      throw new BookingRequestError(409, "Cannot lock seats for a cancelled show");
    }
    if (new Date(show.start_time) <= new Date()) {
      throw new BookingRequestError(409, "Cannot lock seats for a show that has started");
    }

    const seats = await seatRepo.find({
      where: { id: In(input.seatIds) },
      relations: { screen: true },
    });
    if (seats.length !== input.seatIds.length) {
      throw new BookingRequestError(404, "One or more seats were not found");
    }
    if (seats.some((seat) => String(seat.screen?.id) !== String(show.screen?.id))) {
      throw new BookingRequestError(400, "All seats must belong to the show's screen");
    }
    if (seats.some((seat) => seat.status === "disabled")) {
      throw new BookingRequestError(409, "Disabled seats cannot be locked");
    }

    const lockToken = randomUUID();
    const lockedUntil = new Date(Date.now() + duration * 1000);
    for (const seat of seats) {
      let state = await findSeatStateForUpdate(stateRepo, input.showId, seat.id);
      if (state?.status === "booked") {
        throw new BookingRequestError(409, `Seat ${seat.row}${seat.number} is already booked`);
      }
      if (
        state?.status === "locked" &&
        new Date(state.locked_until) > new Date() &&
        String(state.lockedByUser?.id) !== String(req.user.id)
      ) {
        throw new BookingRequestError(409, `Seat ${seat.row}${seat.number} is locked`);
      }

      if (!state) {
        state = stateRepo.create({
          show: { id: input.showId },
          seat: { id: seat.id },
        });
      }
      state.status = "locked";
      state.lockedByUser = { id: req.user.id };
      state.lock_token = lockToken;
      state.locked_until = lockedUntil;
      state.booking = null;
      await saveWithRepository(queryRunner.manager, stateRepo, state);
    }

    await queryRunner.commitTransaction();
    transactionStarted = false;
    return res.json({
      message: "Seats locked",
      lockToken,
      lockedUntil,
      expiresIn: duration,
    });
  } catch (error) {
    if (transactionStarted) await rollbackQuietly(queryRunner, "Lock seats");
    return next(normalizeBookingError(error));
  } finally {
    await releaseQuietly(queryRunner, "Lock seats");
  }
};

exports.unlockSeats = async (req, res, next) => {
  let input;
  try {
    input = normalizeShowSeatRequest(req.body);
  } catch (error) {
    return next(normalizeBookingError(error));
  }

  const { lockToken } = req.body;

  const queryRunner = AppDataSource.createQueryRunner();
  let transactionStarted = false;
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");
    transactionStarted = true;

    const stateRepo = queryRunner.manager.getRepository("ShowSeatState");
    for (const seatId of input.seatIds) {
      const state = await findSeatStateForUpdate(stateRepo, input.showId, seatId);
      if (!state) throw new BookingRequestError(404, "One or more seat locks were not found");
      if (state.status === "booked") {
        throw new BookingRequestError(409, "A booked seat cannot be unlocked");
      }
      if (state.status !== "locked") {
        throw new BookingRequestError(409, "One or more seats are not locked");
      }
      if (
        String(state.lockedByUser?.id) !== String(req.user.id) ||
        String(state.lock_token).toLowerCase() !== lockToken.toLowerCase()
      ) {
        throw new BookingRequestError(403, "Only the lock owner can unlock these seats");
      }

      setStateAvailable(state);
      await saveWithRepository(queryRunner.manager, stateRepo, state);
    }

    await queryRunner.commitTransaction();
    transactionStarted = false;
    return res.json({ message: "Seats unlocked" });
  } catch (error) {
    if (transactionStarted) await rollbackQuietly(queryRunner, "Unlock seats");
    return next(normalizeBookingError(error));
  } finally {
    await releaseQuietly(queryRunner, "Unlock seats");
  }
};
