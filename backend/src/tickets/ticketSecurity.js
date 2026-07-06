const { createHmac, timingSafeEqual } = require("node:crypto");
const { env } = require("../config/env");
const { canonicalJson } = require("../payments/paymentSecurity");

const createTicketPayload = (booking) => {
  const data = { bookingId: booking.id, showId: booking.show.id, ticketCode: booking.ticket_code };
  const signature = createHmac("sha256", env.TICKET_QR_SECRET)
    .update(canonicalJson(data))
    .digest("hex");
  return JSON.stringify({ ...data, signature });
};
const verifyTicketPayload = (payload) => {
  try {
    const { bookingId, showId, ticketCode, signature } =
      typeof payload === "string" ? JSON.parse(payload) : payload;
    if (![bookingId, showId, ticketCode, signature].every((v) => typeof v === "string"))
      return null;
    const expected = createHmac("sha256", env.TICKET_QR_SECRET)
      .update(canonicalJson({ bookingId, showId, ticketCode }))
      .digest("hex");
    if (!/^[a-f0-9]{64}$/i.test(signature)) return null;
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b)
      ? { bookingId, showId, ticketCode }
      : null;
  } catch {
    return null;
  }
};
module.exports = { createTicketPayload, verifyTicketPayload };
