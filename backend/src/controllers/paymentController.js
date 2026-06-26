const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const { signWebhook, verifyWebhook } = require("../payments/paymentSecurity");
const {
  applyPaymentRefund,
  processPaymentEvent,
  releaseBookingSeats,
  withTransaction,
} = require("../services/paymentLifecycleService");
const { recordAuditLog } = require("../services/auditLogService");
const removeSensitiveFields = (value) => {
  if (value instanceof Date || value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(removeSensitiveFields);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "password_hash")
      .map(([key, nested]) => [key, removeSensitiveFields(nested)]),
  );
};

const safe = (payment) => ({
  id: payment.id,
  provider: payment.provider,
  provider_transaction_id: payment.provider_transaction_id,
  amount: payment.amount,
  status: payment.status,
  paid_at: payment.paid_at,
  failed_at: payment.failed_at,
  refunded_amount: payment.refunded_amount,
  created_at: payment.created_at,
  updated_at: payment.updated_at,
  booking: removeSensitiveFields(payment.booking),
});

exports.handleWebhook = async (req, res) => {
  if (
    !verifyWebhook({
      timestamp: req.headers["x-payment-timestamp"],
      signature: req.headers["x-payment-signature"],
      body: req.body,
    })
  )
    throw new AppError(401, "WEBHOOK_SIGNATURE_INVALID", "Invalid webhook signature");
  if (req.params.provider !== "mock")
    throw new AppError(404, "PAYMENT_PROVIDER_NOT_FOUND", "Provider not found");
  const result = await processPaymentEvent(req.body);
  res.json({ received: true, idempotent: result.idempotent, status: result.payment.status });
};
exports.getPayment = async (req, res) => {
  const payment = await AppDataSource.getRepository("Payment").findOne({
    where: { id: req.params.id },
    relations: { booking: { user: true } },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  if (req.user.role !== "admin" && String(payment.booking.user?.id) !== String(req.user.id))
    throw new AppError(403, "PAYMENT_FORBIDDEN", "Forbidden");
  res.json(safe(payment));
};
exports.completeMockPayment = async (req, res) => {
  if (env.NODE_ENV === "production")
    throw new AppError(404, "MOCK_PAYMENT_DISABLED", "Mock payment disabled");
  const payment = await AppDataSource.getRepository("Payment").findOne({
    where: { id: req.params.id },
    relations: { booking: { user: true } },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  if (String(payment.booking.user?.id) !== String(req.user.id))
    throw new AppError(403, "PAYMENT_FORBIDDEN", "Forbidden");
  const body = {
    paymentId: payment.id,
    providerTransactionId: payment.provider_transaction_id,
    status: "paid",
  };
  const timestamp = String(Date.now());
  if (!verifyWebhook({ timestamp, signature: signWebhook(timestamp, body), body }))
    throw new AppError(500, "MOCK_SIGNATURE_FAILED", "Signature failed");
  const result = await processPaymentEvent(body);
  res.json({ payment: safe(result.payment), bookingStatus: result.booking.status });
};
exports.getAdminPayments = async (req, res) => {
  const { page = 1, limit = 20, status, provider, search } = res.locals.validated.query;
  const qb = AppDataSource.getRepository("Payment")
    .createQueryBuilder("payment")
    .leftJoinAndSelect("payment.booking", "booking")
    .leftJoinAndSelect("booking.user", "user")
    .leftJoinAndSelect("booking.show", "show")
    .leftJoinAndSelect("show.movie", "movie");
  if (status) qb.andWhere("payment.status = :status", { status });
  if (provider) qb.andWhere("payment.provider = :provider", { provider });
  if (search)
    qb.andWhere(
      "(user.email LIKE :search OR movie.title LIKE :search OR CONVERT(NVARCHAR(36), booking.id) LIKE :search)",
      { search: `%${search}%` },
    );
  const [items, total] = await qb
    .orderBy("payment.created_at", "DESC")
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  res.json({
    data: items.map(safe),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
exports.confirmCashPayment = async (req, res) => {
  const result = await withTransaction(async (manager) => {
    const payment = await manager.getRepository("Payment").findOne({
      where: { id: req.params.id },
      relations: { booking: { show: true, bookingSeats: { seat: true } } },
      lock: { mode: "pessimistic_write" },
    });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (payment.provider !== "cash")
      throw new AppError(409, "PAYMENT_NOT_CASH", "Not cash payment");
    if (payment.status === "paid" && payment.booking.status === "confirmed")
      return { payment, idempotent: true };
    if (payment.status !== "pending" || payment.booking.status !== "pending_payment")
      throw new AppError(409, "PAYMENT_NOT_PENDING", "Payment not pending");
    if (payment.booking.expires_at && new Date(payment.booking.expires_at) <= new Date()) {
      payment.status = "cancelled";
      payment.booking.status = "expired";
      payment.booking.payment_status = "cancelled";
      payment.booking.expires_at = null;
      await releaseBookingSeats(manager, payment.booking);
      await manager.getRepository("Payment").save(payment);
      await manager.getRepository("Booking").save(payment.booking);
      return { payment, expired: true };
    }
    payment.status = "paid";
    payment.paid_at = new Date();
    payment.booking.status = "confirmed";
    payment.booking.payment_status = "paid";
    payment.booking.expires_at = null;
    await manager.getRepository("Payment").save(payment);
    await manager.getRepository("Booking").save(payment.booking);
    return { payment, idempotent: false };
  });
  if (result.expired) throw new AppError(409, "BOOKING_PAYMENT_EXPIRED", "Payment window expired");
  await recordAuditLog(req, {
    action: "payment.confirm_cash",
    resourceType: "Payment",
    resourceId: result.payment.id,
    metadata: { idempotent: result.idempotent === true },
  });
  res.json({ payment: safe(result.payment), idempotent: result.idempotent });
};
exports.refundPayment = async (req, res) => {
  const payment = await withTransaction(async (manager) => {
    const current = await manager.getRepository("Payment").findOne({
      where: { id: req.params.id },
      relations: { booking: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!current) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (current.booking.status !== "cancelled")
      throw new AppError(409, "BOOKING_NOT_CANCELLED", "Cancel booking first");
    const updated = await applyPaymentRefund(
      manager,
      current.booking,
      res.locals.validated.body.amount ?? current.amount,
    );
    current.booking.refunded_amount = updated.refunded_amount;
    current.booking.payment_status = updated.status;
    await manager.getRepository("Booking").save(current.booking);
    return updated;
  });
  await recordAuditLog(req, {
    action: "payment.refund",
    resourceType: "Payment",
    resourceId: payment.id,
    metadata: {
      amount: res.locals.validated.body.amount ?? payment.amount,
      status: payment.status,
    },
  });
  res.json({ payment: safe(payment) });
};
