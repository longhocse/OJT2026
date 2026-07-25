const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const QRCode = require("qrcode");
const { createTicketPayload } = require("../tickets/ticketSecurity");
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

const buildTicketEmail = async (booking) => {
  const show = booking.show || {};
  const movie = show.movie || {};
  const screen = show.screen || {};
  const theater = screen.theater || {};
  const seats = (booking.bookingSeats || []).map(seatLabel).filter(Boolean).join(", ") || "—";
  const ticketCode = booking.ticket_code || "—";
  const paidAmount = booking.payment?.amount ?? booking.total_price;
  const openTicketUrl = ticketUrl();
  const qrPayload = createTicketPayload(booking);
  const qrCid = `ticket-qr-${booking.id}@movietap`;
  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "png",
    width: 240,
  });

  const text = [
    "Vé điện tử MovieTap",
    "",
    `Xin chào ${booking.user?.name || booking.user?.email || "bạn"},`,
    `Booking của bạn đã được xác nhận. Mã vé: ${ticketCode}`,
    `Phim: ${movie.title || "—"}`,
    `Suất chiếu: ${formatDateTime(show.start_time)}`,
    `Rạp/phòng: ${theater.name || "—"} / ${screen.name || "—"}`,
    `Ghế: ${seats}`,
    `Tổng thanh toán: ${formatMoney(paidAmount)}`,
    "",
    "Mã QR đã được đính kèm trong email này.",
    `Nếu email không hiển thị QR, mở vé trong MovieTap tại: ${openTicketUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="vi">
  <body style="margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111111;color:#ffffff;padding:22px 28px;">
                <div style="font-size:24px;font-weight:900;letter-spacing:.02em;">MovieTap</div>
                <div style="margin-top:8px;color:#e5e7eb;font-size:14px;">Vé điện tử · Đã thanh toán</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;border-bottom:1px solid #e5e7eb;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="left">
                      <span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;">ĐÃ XÁC NHẬN</span>
                    </td>
                    <td align="right" style="font-family:'Courier New',monospace;font-size:14px;font-weight:800;color:#374151;">
                      ${escapeHtml(ticketCode)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 18px;color:#374151;">Xin chào <strong>${escapeHtml(booking.user?.name || booking.user?.email || "bạn")}</strong>, đưa mã QR này cho nhân viên rạp để check-in.</p>

                <div style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:22px;background:#fafafa;">
                  <div style="font-size:18px;font-weight:900;margin-bottom:8px;">${escapeHtml(movie.title || "—")}</div>
                  <div style="font-size:24px;font-weight:900;margin-bottom:8px;">${escapeHtml(formatDateTime(show.start_time))}</div>
                  <div style="font-weight:700;color:#374151;">${escapeHtml(theater.name || "—")} · ${escapeHtml(screen.name || "—")}</div>
                  <div style="margin-top:10px;">
                    <span style="display:inline-block;border:1px solid #e5e7eb;background:#ffffff;border-radius:999px;padding:5px 9px;font-size:12px;color:#374151;">Ghế ${escapeHtml(seats)}</span>
                    <span style="display:inline-block;border:1px solid #e5e7eb;background:#ffffff;border-radius:999px;padding:5px 9px;font-size:12px;color:#374151;margin-left:6px;">${(booking.bookingSeats || []).length || 1} vé</span>
                  </div>
                </div>

                <div style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:20px 0;text-align:center;">
                  <div style="display:inline-block;border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#ffffff;">
                    <img src="cid:${qrCid}" width="240" height="240" alt="QR vé ${escapeHtml(ticketCode)}" style="display:block;width:240px;height:240px;" />
                  </div>
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px;">
                  <tr>
                    <td style="padding:10px 0;color:#6b7280;">Tổng thanh toán</td>
                    <td style="padding:10px 0;text-align:right;font-weight:800;">${escapeHtml(formatMoney(paidAmount))}</td>
                  </tr>
                </table>

                <p style="margin:18px 0 0;color:#6b7280;font-size:12px;">ⓘ Đưa mã QR cho nhân viên khi vào rạp. Vé hợp lệ cho đúng suất chiếu, rạp và ghế trên vé.</p>
                <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">Nếu email không hiển thị QR, bạn có thể mở vé trong MovieTap tại: <a href="${escapeHtml(openTicketUrl)}" style="color:#2563eb;">${escapeHtml(openTicketUrl)}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    text,
    html,
    attachments: [
      {
        filename: `${ticketCode}.png`,
        content: qrBuffer,
        cid: qrCid,
      },
    ],
  };
};

const sendTicketEmailForBooking = async (bookingId) => {
  try {
    const booking = await loadTicketBooking(bookingId);
    if (!booking?.user?.email || !["confirmed", "used"].includes(booking.status)) {
      return { sent: false, skipped: true };
    }
    const { text, html, attachments } = await buildTicketEmail(booking);
    const result = await sendMail({
      to: booking.user.email,
      subject: `Vé điện tử MovieTap - ${booking.show?.movie?.title || booking.ticket_code}`,
      text,
      html,
      attachments,
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
