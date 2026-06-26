const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { createTicketPayload, verifyTicketPayload } = require("../tickets/ticketSecurity");
const { withTransaction } = require("../services/paymentLifecycleService");
exports.getTicket = async (req, res) => {
  const booking = await AppDataSource.getRepository("Booking").findOne({
    where: { id: req.params.id },
    relations: { user: true, show: { movie: true, screen: { theater: true } } },
  });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  if (req.user.role !== "admin" && String(booking.user?.id) !== String(req.user.id))
    throw new AppError(403, "BOOKING_FORBIDDEN", "Forbidden");
  if (!["confirmed", "used"].includes(booking.status))
    throw new AppError(409, "TICKET_NOT_ACTIVE", "Ticket not active");
  res.json({
    ticketCode: booking.ticket_code,
    status: booking.status,
    checkedInAt: booking.checked_in_at,
    qrPayload: createTicketPayload(booking),
  });
};
exports.checkInTicket = async (req, res) => {
  const payload = verifyTicketPayload(res.locals.validated.body.qrPayload);
  if (!payload) throw new AppError(400, "TICKET_SIGNATURE_INVALID", "Invalid ticket signature");
  const result = await withTransaction(async (manager) => {
    const booking = await manager.getRepository("Booking").findOne({
      where: { id: payload.bookingId },
      relations: { show: true },
      lock: { mode: "pessimistic_write" },
    });
    if (
      !booking ||
      booking.ticket_code !== payload.ticketCode ||
      String(booking.show?.id) !== payload.showId
    )
      throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found");
    if (booking.status === "used") return { booking, alreadyCheckedIn: true };
    if (booking.status !== "confirmed")
      throw new AppError(409, "TICKET_NOT_ACTIVE", "Ticket not active");
    booking.status = "used";
    booking.checked_in_at = new Date();
    await manager.getRepository("Booking").save(booking);
    return { booking, alreadyCheckedIn: false };
  });
  res.json({
    ticketCode: result.booking.ticket_code,
    status: result.booking.status,
    checkedInAt: result.booking.checked_in_at,
    alreadyCheckedIn: result.alreadyCheckedIn,
  });
};
