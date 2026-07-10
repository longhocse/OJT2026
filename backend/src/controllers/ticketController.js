const { AppDataSource } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { createTicketPayload, verifyTicketPayload } = require("../tickets/ticketSecurity");
const { withTransaction } = require("../services/paymentLifecycleService");
const { assertBookingAccess } = require("../services/accessControlService");

const ticketRelations = {
  user: true,
  show: { movie: true, screen: { theater: true } },
  bookingSeats: { seat: true },
  payment: true,
};

const loadTicketBooking = (bookingId) =>
  AppDataSource.getRepository("Booking").findOne({
    where: { id: bookingId },
    relations: ticketRelations,
  });

const safeUser = (user) =>
  user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      }
    : null;

const seatLabel = (bookingSeat) => {
  const seat = bookingSeat?.seat;
  if (!seat) return null;
  return `${String(seat.row || "").trim()}${seat.number}`;
};

const buildTicketResponse = (booking, { qrPayload, alreadyCheckedIn } = {}) => {
  const seats = (booking.bookingSeats || [])
    .map((bookingSeat) => ({
      id: bookingSeat.seat?.id || null,
      row: bookingSeat.seat?.row || null,
      number: bookingSeat.seat?.number || null,
      type: bookingSeat.seat?.type || null,
      status: bookingSeat.status,
      price: Number(bookingSeat.price || 0),
      label: seatLabel(bookingSeat),
    }))
    .filter((seat) => seat.label);

  return {
    ticketCode: booking.ticket_code,
    status: booking.status,
    checkedInAt: booking.checked_in_at,
    alreadyCheckedIn,
    qrPayload,
    booking: {
      id: booking.id,
      total_price: Number(booking.total_price || 0),
      status: booking.status,
      payment_method: booking.payment_method,
      payment_status: booking.payment_status,
      refunded_amount: Number(booking.refunded_amount || 0),
      ticket_code: booking.ticket_code,
      checked_in_at: booking.checked_in_at,
      created_at: booking.created_at,
      user: safeUser(booking.user),
      show: booking.show
        ? {
            id: booking.show.id,
            start_time: booking.show.start_time,
            end_time: booking.show.end_time,
            price: Number(booking.show.price || 0),
            status: booking.show.status,
            movie: booking.show.movie
              ? {
                  id: booking.show.movie.id,
                  title: booking.show.movie.title,
                  duration: Number(booking.show.movie.duration || 0),
                  age_rating: booking.show.movie.age_rating,
                }
              : null,
            screen: booking.show.screen
              ? {
                  id: booking.show.screen.id,
                  name: booking.show.screen.name,
                  theater: booking.show.screen.theater
                    ? {
                        id: booking.show.screen.theater.id,
                        name: booking.show.screen.theater.name,
                        address: booking.show.screen.theater.address,
                        city: booking.show.screen.theater.city,
                      }
                    : null,
                }
              : null,
          }
        : null,
      seats,
      bookingSeats: booking.bookingSeats || [],
      payment: booking.payment
        ? {
            id: booking.payment.id,
            provider: booking.payment.provider,
            provider_transaction_id: booking.payment.provider_transaction_id,
            amount: Number(booking.payment.amount || 0),
            status: booking.payment.status,
            refunded_amount: Number(booking.payment.refunded_amount || 0),
            paid_at: booking.payment.paid_at,
          }
        : null,
    },
  };
};

exports.getTicket = async (req, res) => {
  const booking = await loadTicketBooking(req.params.id);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  if (req.user.role !== "admin" && String(booking.user?.id) !== String(req.user.id)) {
    throw new AppError(403, "BOOKING_FORBIDDEN", "Forbidden");
  }
  if (!["confirmed", "used"].includes(booking.status)) {
    throw new AppError(409, "TICKET_NOT_ACTIVE", "Ticket not active");
  }
  res.json(buildTicketResponse(booking, { qrPayload: createTicketPayload(booking) }));
};

exports.checkInTicket = async (req, res) => {
  const payload = verifyTicketPayload(res.locals.validated.body.qrPayload);
  if (!payload) throw new AppError(400, "TICKET_SIGNATURE_INVALID", "Invalid ticket signature");

  const result = await withTransaction(async (manager) => {
    const booking = await manager.getRepository("Booking").findOne({
      where: { id: payload.bookingId },
      relations: { show: { screen: { theater: true } } },
      lock: { mode: "pessimistic_write" },
    });
    if (
      !booking ||
      booking.ticket_code !== payload.ticketCode ||
      String(booking.show?.id) !== payload.showId
    ) {
      throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found");
    }
    await assertBookingAccess(manager, req, booking.id);
    if (booking.status === "used") return { booking, alreadyCheckedIn: true };
    if (booking.status !== "confirmed") {
      throw new AppError(409, "TICKET_NOT_ACTIVE", "Ticket not active");
    }
    booking.status = "used";
    booking.checked_in_at = new Date();
    await manager.getRepository("Booking").save(booking);
    return { booking, alreadyCheckedIn: false };
  });

  let ticketBooking = null;
  try {
    ticketBooking = await loadTicketBooking(result.booking.id);
  } catch (error) {
    if (error.name !== "EntityMetadataNotFoundError") throw error;
  }
  res.json(
    buildTicketResponse(ticketBooking || result.booking, {
      qrPayload: res.locals.validated.body.qrPayload,
      alreadyCheckedIn: result.alreadyCheckedIn,
    }),
  );
};
