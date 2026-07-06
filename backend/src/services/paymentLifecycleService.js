const { LessThanOrEqual } = require("typeorm");
const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { applyRefundSummary } = require("../utils/refundPolicy");
const { getProvider } = require("../payments/providerRegistry");

const withTransaction = async (work) => {
  const runner = AppDataSource.createQueryRunner();
  let started = false;
  try {
    await runner.connect();
    await runner.startTransaction("SERIALIZABLE");
    started = true;
    const result = await work(runner.manager);
    await runner.commitTransaction();
    started = false;
    return result;
  } catch (error) {
    if (started) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};

const releaseBookingSeats = async (manager, booking) => {
  const states = manager.getRepository("ShowSeatState");
  for (const bs of booking.bookingSeats || []) {
    const state = await states.findOne({
      where: { show: { id: booking.show.id }, seat: { id: bs.seat.id } },
      relations: { booking: true },
      lock: { mode: "pessimistic_write" },
    });
    if (state && String(state.booking?.id) === String(booking.id)) {
      Object.assign(state, {
        status: "available",
        lockedByUser: null,
        lock_token: null,
        locked_until: null,
        booking: null,
      });
      await states.save(state);
    }
    bs.status = "cancelled";
  }
  if (booking.bookingSeats?.length)
    await manager.getRepository("BookingSeat").save(booking.bookingSeats);
};

const paymentForUpdate = (manager, where) =>
  manager.getRepository("Payment").findOne({
    where,
    relations: { booking: { show: true, bookingSeats: { seat: true } } },
    lock: { mode: "pessimistic_write" },
  });

const processPaymentEvent = (event) =>
  withTransaction(async (manager) => {
    const payment = await paymentForUpdate(manager, { id: event.paymentId });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (
      payment.provider_transaction_id &&
      event.providerTransactionId !== payment.provider_transaction_id
    )
      throw new AppError(409, "PAYMENT_TRANSACTION_MISMATCH", "Transaction mismatch");
    const booking = payment.booking;
    const now = new Date();
    if (event.status === "paid") {
      if (payment.status === "paid" && booking.status === "confirmed")
        return { payment, booking, idempotent: true };
      if (booking.status !== "pending_payment" || new Date(booking.expires_at) <= now) {
        const provider = getProvider(payment.provider);
        if (!provider) throw new AppError(409, "PAYMENT_PROVIDER_NOT_FOUND", "Provider not found");
        await provider.refund({ payment, amount: Number(payment.amount) });
        payment.status = "refunded";
        payment.refunded_amount = Number(payment.amount);
        payment.paid_at ||= now;
        if (booking.status === "pending_payment") {
          booking.status = "expired";
          await releaseBookingSeats(manager, booking);
        }
        applyRefundSummary(booking, booking.total_price);
      } else {
        payment.status = "paid";
        payment.paid_at = now;
        booking.status = "confirmed";
        booking.payment_status = "paid";
        booking.expires_at = null;
      }
    } else if (event.status === "failed") {
      if (payment.status === "failed" && booking.status === "expired")
        return { payment, booking, idempotent: true };
      if (payment.status === "paid")
        throw new AppError(409, "PAYMENT_ALREADY_PAID", "Payment already paid");
      payment.status = "failed";
      payment.failed_at = now;
      booking.payment_status = "failed";
      if (booking.status === "pending_payment") {
        booking.status = "expired";
        booking.expires_at = null;
        await releaseBookingSeats(manager, booking);
      }
    } else throw new AppError(400, "PAYMENT_STATUS_INVALID", "Unsupported payment status");
    await manager.getRepository("Payment").save(payment);
    await manager.getRepository("Booking").save(booking);
    return { payment, booking, idempotent: false };
  });

const applyPaymentRefund = async (manager, booking, amount) => {
  const repo = manager.getRepository("Payment");
  const payment = await repo.findOne({
    where: { booking: { id: booking.id } },
    lock: { mode: "pessimistic_write" },
  });
  if (!payment) return null;
  const target = Math.min(Number(payment.amount), Math.max(0, Number(amount) || 0));
  if (payment.status === "pending") payment.status = "cancelled";
  else if (target > Number(payment.refunded_amount || 0)) {
    const provider = getProvider(payment.provider);
    if (!provider) throw new AppError(409, "PAYMENT_PROVIDER_NOT_FOUND", "Provider not found");
    await provider.refund({ payment, amount: target });
    payment.refunded_amount = target;
    payment.status = target >= Number(payment.amount) ? "refunded" : "partially_refunded";
  }
  await repo.save(payment);
  return payment;
};

const expireBooking = (id) =>
  withTransaction(async (manager) => {
    const booking = await manager.getRepository("Booking").findOne({
      where: { id },
      relations: { show: true, bookingSeats: { seat: true } },
      lock: { mode: "pessimistic_write" },
    });
    if (
      !booking ||
      booking.status !== "pending_payment" ||
      !booking.expires_at ||
      new Date(booking.expires_at) > new Date()
    )
      return false;
    booking.status = "expired";
    booking.payment_status = "cancelled";
    booking.expires_at = null;
    await releaseBookingSeats(manager, booking);
    const payment = await paymentForUpdate(manager, { booking: { id } });
    if (payment?.status === "pending") {
      payment.status = "cancelled";
      await manager.getRepository("Payment").save(payment);
    }
    await manager.getRepository("Booking").save(booking);
    return true;
  });
const expirePendingBookings = async () => {
  const rows = await AppDataSource.getRepository("Booking").find({
    select: { id: true },
    where: { status: "pending_payment", expires_at: LessThanOrEqual(new Date()) },
  });
  let count = 0;
  for (const row of rows) if (await expireBooking(row.id)) count += 1;
  return count;
};
module.exports = {
  applyPaymentRefund,
  expireBooking,
  expirePendingBookings,
  processPaymentEvent,
  releaseBookingSeats,
  withTransaction,
};
