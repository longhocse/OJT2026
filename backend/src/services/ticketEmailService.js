const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { sendMail } = require("./mailService");
const logger = require("../utils/logger");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "—";

const seatLabel = (bookingSeat) => {
  const seat = bookingSeat?.seat;
  if (!seat) return null;
  return `${String(seat.row || "").trim()}${seat.number}`;
};

const ticketUrl = () => new URL("/my-bookings", env.FRONTEND_URL).toString();

const loadTicketBooking = (bookingId) =>
  AppDataSource.getRepository("Booking").findOne({
    where: { id: bookingId },
    relations: {
      user: true,
      show: { movie: true, screen: { theater: true } },
      bookingSeats: { seat: true },
      payment: true,
    },
  });

const buildTicketEmail = (booking) => {
  const show = booking.show || {};
  const movie = show.movie || {};
  const screen = show.screen || {};
  const theater = screen.theater || {};
  const seats = (booking.bookingSeats || []).map(seatLabel).filter(Boolean).join(", ") || "—";
  const openTicketUrl = ticketUrl();
  const ticketCode = booking.ticket_code || "—";
  const paidAmount = booking.payment?.amount ?? booking.total_price;

  const text = [
    "Vé điện tử MovieTap",
    "",
    `Xin chào ${booking.user?.name || booking.user?.email || "bạn"},`,
    `Booking của bạn đã được xác nhận. Mã vé: ${ticketCode}`,
    `Phim: ${movie.title || "—"}`,
    `Suất chiếu: ${formatDateTime(show.start_time)}`,
    `Rạp/phòng: ${theater.name || "—"} / ${screen.name || "—"}`,
    `Ghế: ${seats}`,
    `Tổng tiền: ${formatMoney(paidAmount)}`,
    "",
    `Mở vé QR tại: ${openTicketUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="vi">
  <body style="margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:28px 32px;">
                <div style="color:#facc15;font-size:28px;font-weight:800;letter-spacing:.04em;">CINEMA NOIR</div>
                <div style="margin-top:8px;color:#d1d5db;">Vé điện tử MovieTap</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 12px;">Xin chào <strong>${escapeHtml(booking.user?.name || booking.user?.email || "bạn")}</strong>,</p>
                <p style="margin:0 0 20px;">Booking của bạn đã được xác nhận. Vui lòng mở vé QR khi đến rạp để check-in.</p>
                <div style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:20px;">
                  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:700;">Mã vé</div>
                  <div style="font-size:22px;font-weight:800;font-family:'Courier New',monospace;">${escapeHtml(ticketCode)}</div>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Phim</td>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(movie.title || "—")}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Suất chiếu</td>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(formatDateTime(show.start_time))}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Rạp/phòng</td>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(theater.name || "—")} / ${escapeHtml(screen.name || "—")}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Ghế</td>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(seats)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Tổng tiền</td>
                    <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(formatMoney(paidAmount))}</td>
                  </tr>
                </table>
                <div style="margin-top:26px;text-align:center;">
                  <a href="${escapeHtml(openTicketUrl)}" style="display:inline-block;background:#d4af37;color:#111827;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 22px;">Mở vé QR</a>
                </div>
                <p style="margin:22px 0 0;color:#6b7280;font-size:12px;">Vé chỉ hợp lệ cho đúng phim, suất chiếu và ghế ghi trong email này.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
};

const sendTicketEmailForBooking = async (bookingId) => {
  try {
    const booking = await loadTicketBooking(bookingId);
    if (!booking?.user?.email || !["confirmed", "used"].includes(booking.status)) {
      return { sent: false, skipped: true };
    }
    const { text, html } = buildTicketEmail(booking);
    const result = await sendMail({
      to: booking.user.email,
      subject: `Vé điện tử MovieTap - ${booking.show?.movie?.title || booking.ticket_code}`,
      text,
      html,
    });
    logger.info("ticket_email_processed", {
      bookingId: booking.id,
      ticketCode: booking.ticket_code,
      sent: result.sent === true,
      skipped: result.skipped === true,
    });
    return result;
  } catch (error) {
    if (error.name === "EntityMetadataNotFoundError") {
      logger.info("ticket_email_skipped", {
        bookingId,
        reason: "booking_metadata_unavailable",
      });
      return { sent: false, skipped: true };
    }
    logger.error("ticket_email_failed", { bookingId, error: error.message });
    return { sent: false, error };
  }
};

module.exports = { sendTicketEmailForBooking };
