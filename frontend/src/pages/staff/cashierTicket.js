import QRCode from "qrcode";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export async function printCashierTicket(ticket) {
  const booking = ticket.booking || {};
  const show = booking.show || {};
  const seats = (booking.seats || booking.bookingSeats || [])
    .map((item) => item.label || (item.seat ? `${item.seat.row}${item.seat.number}` : ""))
    .filter(Boolean).join(", ");
  const payload = ticket.qrPayload;
  const qr = payload ? await QRCode.toDataURL(payload, { width: 300, margin: 1 }) : "";
  const popup = window.open("", "_blank", "width=760,height=720");
  if (!popup) throw new Error("Trình duyệt đã chặn cửa sổ in vé.");
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Vé ${escapeHtml(ticket.ticketCode)}</title><style>body{font-family:Arial;background:#eee;padding:24px}.ticket{max-width:650px;margin:auto;background:#fff;border-radius:18px;overflow:hidden}.head{background:#0b1120;color:white;padding:22px}.brand{color:#facc15;font-size:25px;font-weight:800}.body{display:grid;grid-template-columns:1fr 210px;gap:20px;padding:26px}.row{padding:9px 0;border-bottom:1px solid #ddd}.label{font-size:11px;color:#666;text-transform:uppercase}.value{font-weight:700;margin-top:3px}img{width:200px}button{margin:20px;padding:12px 20px}@media print{body{background:white;padding:0}button{display:none}}</style></head><body><section class="ticket"><div class="head"><div class="brand">CINEMA NOIR</div><div>Mã vé: ${escapeHtml(ticket.ticketCode || booking.ticket_code || "—")}</div></div><div class="body"><div><h1>${escapeHtml(show.movie?.title || "Vé xem phim")}</h1><div class="row"><div class="label">Cơ sở</div><div class="value">${escapeHtml(show.screen?.theater?.name || "—")}</div></div><div class="row"><div class="label">Phòng / Ghế</div><div class="value">${escapeHtml(show.screen?.name || "—")} · ${escapeHtml(seats || "—")}</div></div><div class="row"><div class="label">Suất chiếu</div><div class="value">${escapeHtml(show.start_time ? new Date(show.start_time).toLocaleString("vi-VN") : "—")}</div></div></div><div>${qr ? `<img src="${qr}" alt="QR vé">` : ""}</div></div></section><button onclick="window.print()">In vé</button></body></html>`);
  popup.document.close();
}
