import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import FormAlert from "../../components/common/FormAlert";
import { paymentService } from "../../services/paymentService";
import { queryKeys } from "../../services/queryKeys";

const statuses = ["pending", "paid", "failed", "cancelled", "partially_refunded", "refunded"];
const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const text = (value, fallback = "—") =>
  value === undefined || value === null || value === "" ? fallback : String(value);
const escapeHtml = (value) =>
  text(value, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const seatLabels = (booking) => {
  const seats = Array.isArray(booking?.seats)
    ? booking.seats
    : Array.isArray(booking?.bookingSeats)
      ? booking.bookingSeats.map((item) => ({
          label:
            item.label ||
            (item.seat ? `${String(item.seat.row || "").trim()}${item.seat.number}` : null),
        }))
      : [];
  return (
    seats
      .map((seat) => seat.label)
      .filter(Boolean)
      .join(", ") || "—"
  );
};

const buildTicketHtml = ({ ticket, qrImageUrl }) => {
  const booking = ticket.booking || {};
  const show = booking.show || {};
  const movie = show.movie || {};
  const screen = show.screen || {};
  const theater = screen.theater || {};
  const user = booking.user || {};
  const payment = booking.payment || {};
  const ticketCode = ticket.ticketCode || booking.ticket_code || "—";

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>Vé MovieTap ${escapeHtml(ticketCode)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f3f4f6;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
      }
      .page {
        width: 760px;
        margin: 24px auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        overflow: hidden;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 26px 32px;
        color: #ffffff;
        background: linear-gradient(135deg, #111827, #1f2937);
      }
      .brand {
        color: #facc15;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      .ticket-code {
        margin-top: 8px;
        font-family: "Courier New", monospace;
        font-size: 13px;
        color: #d1d5db;
      }
      .status {
        align-self: flex-start;
        border: 1px solid rgba(250, 204, 21, 0.55);
        border-radius: 999px;
        padding: 8px 14px;
        color: #facc15;
        font-weight: 700;
        text-transform: uppercase;
      }
      .content {
        display: grid;
        grid-template-columns: 1fr 220px;
        gap: 28px;
        padding: 30px 32px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 30px;
      }
      .meta {
        margin: 0 0 22px;
        color: #4b5563;
        font-size: 15px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .field {
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
      }
      .label {
        color: #6b7280;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .value {
        margin-top: 5px;
        font-size: 16px;
        font-weight: 700;
      }
      .qr-box {
        align-self: start;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 16px;
        text-align: center;
      }
      .qr-box img {
        width: 170px;
        height: 170px;
      }
      .qr-caption {
        margin-top: 10px;
        color: #4b5563;
        font-size: 12px;
      }
      .footer {
        border-top: 1px dashed #d1d5db;
        padding: 18px 32px 26px;
        color: #6b7280;
        font-size: 12px;
      }
      .actions {
        margin: 18px auto 0;
        width: 760px;
        text-align: right;
      }
      button {
        cursor: pointer;
        border: 0;
        border-radius: 10px;
        background: #d4af37;
        color: #111827;
        font-weight: 800;
        padding: 12px 18px;
      }
      @media print {
        body { background: #ffffff; }
        .page { width: 100%; margin: 0; border: 0; border-radius: 0; }
        .actions { display: none; }
      }
    </style>
  </head>
  <body>
    <section class="page">
      <div class="header">
        <div>
          <div class="brand">CINEMA NOIR</div>
          <div class="ticket-code">Mã vé: ${escapeHtml(ticketCode)}</div>
        </div>
        <div class="status">${escapeHtml(ticket.status || booking.status || "ticket")}</div>
      </div>
      <div class="content">
        <div>
          <h1>${escapeHtml(movie.title || "Vé xem phim")}</h1>
          <p class="meta">${escapeHtml(theater.name)} · ${escapeHtml(screen.name)} · ${escapeHtml(dateTime(show.start_time))}</p>
          <div class="grid">
            <div class="field">
              <div class="label">Ghế</div>
              <div class="value">${escapeHtml(seatLabels(booking))}</div>
            </div>
            <div class="field">
              <div class="label">Suất chiếu</div>
              <div class="value">${escapeHtml(dateTime(show.start_time))}</div>
            </div>
            <div class="field">
              <div class="label">Rạp</div>
              <div class="value">${escapeHtml(theater.name)}</div>
            </div>
            <div class="field">
              <div class="label">Phòng</div>
              <div class="value">${escapeHtml(screen.name)}</div>
            </div>
            <div class="field">
              <div class="label">Khách hàng</div>
              <div class="value">${escapeHtml(user.name || user.email)}</div>
            </div>
            <div class="field">
              <div class="label">Liên hệ</div>
              <div class="value">${escapeHtml(user.phone || user.email)}</div>
            </div>
            <div class="field">
              <div class="label">Thanh toán</div>
              <div class="value">${escapeHtml(payment.provider || booking.payment_method)} · ${escapeHtml(payment.status || booking.payment_status)}</div>
            </div>
            <div class="field">
              <div class="label">Tổng tiền</div>
              <div class="value">${escapeHtml(money(payment.amount || booking.total_price))}</div>
            </div>
            <div class="field">
              <div class="label">Booking</div>
              <div class="value" style="font-family:'Courier New',monospace;font-size:12px">${escapeHtml(booking.id)}</div>
            </div>
            <div class="field">
              <div class="label">Check-in</div>
              <div class="value">${escapeHtml(dateTime(ticket.checkedInAt || booking.checked_in_at))}</div>
            </div>
          </div>
        </div>
        <aside class="qr-box">
          ${
            qrImageUrl
              ? `<img alt="QR vé" src="${qrImageUrl}" />`
              : `<div style="height:170px;display:grid;place-items:center;color:#6b7280">Không có QR</div>`
          }
          <div class="qr-caption">Quét QR này để xác thực vé tại quầy.</div>
        </aside>
      </div>
      <div class="footer">
        Vé chỉ hợp lệ cho đúng phim, suất chiếu và ghế ghi trên vé. Vui lòng đến trước giờ chiếu để check-in.
      </div>
    </section>
    <div class="actions">
      <button onclick="window.print()">In / Lưu PDF</button>
    </div>
  </body>
</html>`;
};

const printTicket = async (ticket) => {
  const qrImageUrl = ticket.qrPayload
    ? await QRCode.toDataURL(ticket.qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 360,
        color: { dark: "#111827", light: "#ffffff" },
      })
    : "";
  const popup = window.open("", "_blank", "width=900,height=760");
  if (!popup) throw new Error("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
  popup.document.open();
  popup.document.write(buildTicketHtml({ ticket, qrImageUrl }));
  popup.document.close();
  popup.focus();
};

const isBarcodeDetectorAvailable = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

const detectQrFromBitmap = async (bitmap) => {
  if (!isBarcodeDetectorAvailable()) {
    throw new Error("Trình duyệt chưa hỗ trợ quét QR từ ảnh/camera. Hãy nhập payload thủ công.");
  }
  const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  const codes = await detector.detect(bitmap);
  const value = codes[0]?.rawValue;
  if (!value)
    throw new Error("Không đọc được QR. Vui lòng chọn ảnh rõ hơn hoặc nhập payload thủ công.");
  return value;
};

export default function AdminPayments() {
  const client = useQueryClient();
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", provider: "" });
  const [qrPayload, setQrPayload] = useState("");
  const [notice, setNotice] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const params = {
    page,
    limit: 20,
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  };
  const query = useQuery({
    queryKey: queryKeys.admin.payments.list(params),
    queryFn: () => paymentService.getAdminPayments(params),
  });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.admin.payments.all });
  const cash = useMutation({
    mutationFn: paymentService.confirmCash,
    onSuccess: refresh,
    onError: (e) => setNotice(e.response?.data?.message || "Không thể xác nhận tiền mặt."),
  });
  const refund = useMutation({
    mutationFn: ({ id, amount }) => paymentService.refund(id, amount),
    onSuccess: refresh,
    onError: (e) => setNotice(e.response?.data?.message || "Không thể hoàn tiền."),
  });
  const checkIn = useMutation({
    mutationFn: paymentService.checkIn,
    onSuccess: (data) => {
      setNotice(data.alreadyCheckedIn ? "Vé đã được check-in trước đó." : "Check-in thành công.");
      setCheckInResult(data);
      setQrPayload("");
      refresh();
    },
    onError: (e) => {
      setCheckInResult(null);
      setNotice(e.response?.data?.message || "Check-in thất bại.");
    },
  });
  const print = useMutation({
    mutationFn: async (bookingId) => {
      const ticket = await paymentService.getTicket(bookingId);
      await printTicket(ticket);
      return ticket;
    },
    onError: (e) => setNotice(e.message || e.response?.data?.message || "Không thể mở vé in."),
  });
  const printCurrentTicket = async () => {
    if (!checkInResult) return;
    try {
      setNotice("");
      await printTicket(checkInResult);
    } catch (error) {
      setNotice(error.message || "Không thể mở vé in.");
    }
  };
  const setFilter = (name, value) => {
    setPage(1);
    setFilters((old) => ({ ...old, [name]: value }));
  };

  const stopCamera = () => {
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
  };

  useEffect(
    () => () => {
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const submitPayload = (payload = qrPayload) => {
    const trimmed = payload.trim();
    if (!trimmed || checkIn.isPending) return;
    setNotice("");
    setCheckInResult(null);
    checkIn.mutate(trimmed);
  };

  const startCamera = async () => {
    setScanNotice("");
    if (!isBarcodeDetectorAvailable()) {
      setScanNotice(
        "Trình duyệt chưa hỗ trợ quét QR bằng camera. Hãy upload ảnh hoặc nhập payload.",
      );
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const scan = async () => {
        if (!videoRef.current || !cameraStreamRef.current) return;
        try {
          const payload = await detectQrFromBitmap(videoRef.current);
          setQrPayload(payload);
          stopCamera();
          submitPayload(payload);
          return;
        } catch (_error) {
          scanTimerRef.current = window.setTimeout(scan, 500);
        }
      };
      scanTimerRef.current = window.setTimeout(scan, 500);
    } catch (error) {
      stopCamera();
      setScanNotice(error.message || "Không thể mở camera. Hãy kiểm tra quyền camera.");
    }
  };

  const handleUploadQr = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanNotice("");
    try {
      const bitmap = await createImageBitmap(file);
      let payload;
      try {
        payload = await detectQrFromBitmap(bitmap);
      } finally {
        bitmap.close?.();
      }
      setQrPayload(payload);
      submitPayload(payload);
    } catch (error) {
      setScanNotice(error.message || "Không đọc được QR từ ảnh.");
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Thanh toán, hoàn tiền và check-in</h1>
      <div className="mb-5 grid gap-3 rounded-xl bg-white p-4 dark:bg-gray-800 md:grid-cols-3">
        <input
          aria-label="Tìm payment"
          placeholder="Email, phim, mã booking"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        />
        <select
          aria-label="Trạng thái payment"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        >
          <option value="">Mọi trạng thái</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Provider"
          value={filters.provider}
          onChange={(e) => setFilter("provider", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        >
          <option value="">Mọi provider</option>
          <option value="mock">mock</option>
          <option value="cash">cash</option>
          <option value="legacy">legacy</option>
        </select>
      </div>
      <section className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
        <h2 className="font-semibold">Quét QR / upload ảnh / nhập payload</h2>
        <p className="mt-1 text-sm text-gray-500">
          Có thể quét camera laptop, tải ảnh QR chụp từ điện thoại, hoặc dán payload thủ công.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCamera}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Bật camera quét QR
          </button>
          <label className="cursor-pointer rounded bg-slate-600 px-4 py-2 text-white">
            Tải ảnh QR
            <input type="file" accept="image/*" onChange={handleUploadQr} className="sr-only" />
          </label>
          {cameraActive && (
            <button
              type="button"
              onClick={stopCamera}
              className="rounded bg-gray-600 px-4 py-2 text-white"
            >
              Tắt camera
            </button>
          )}
        </div>
        {cameraActive && (
          <video
            ref={videoRef}
            muted
            playsInline
            className="mt-3 aspect-video max-h-80 w-full rounded-lg bg-black object-contain"
          />
        )}
        {scanNotice && (
          <p className="mt-3 rounded bg-amber-500/10 p-3 text-sm text-amber-400">{scanNotice}</p>
        )}
        <textarea
          aria-label="QR payload"
          value={qrPayload}
          onChange={(e) => setQrPayload(e.target.value)}
          rows="3"
          placeholder="Dán payload trong QR nếu không quét được"
          className="mt-3 w-full rounded border p-2 font-mono text-xs dark:bg-gray-700"
        />
        <button
          type="button"
          disabled={!qrPayload.trim() || checkIn.isPending}
          onClick={() => submitPayload()}
          className="mt-2 rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {checkIn.isPending ? "Đang check-in..." : "Check-in vé"}
        </button>
        {checkInResult && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
            <p className="font-semibold">
              {checkInResult.alreadyCheckedIn ? "Vé đã check-in trước đó" : "Check-in thành công"}
            </p>
            <p className="mt-1 font-mono text-xs">Mã vé: {checkInResult.ticketCode || "—"}</p>
            <p className="font-mono text-xs">Trạng thái: {checkInResult.status || "—"}</p>
            {checkInResult.checkedInAt && (
              <p className="font-mono text-xs">Thời gian: {checkInResult.checkedInAt}</p>
            )}
            {checkInResult.booking && (
              <button
                type="button"
                onClick={printCurrentTicket}
                className="mt-3 rounded bg-yellow-500 px-3 py-2 font-semibold text-gray-950"
              >
                In vé / lưu PDF
              </button>
            )}
          </div>
        )}
      </section>
      <FormAlert message={notice} />
      {query.isPending ? (
        <p role="status">Đang tải payment...</p>
      ) : query.isError ? (
        <p role="alert">Không thể tải payment.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
            <table className="min-w-[900px] w-full text-left">
              <thead>
                <tr>
                  <th className="p-3">Booking</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Số tiền</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Hoàn</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((p) => (
                  <tr key={p.id} className="border-t dark:border-gray-700">
                    <td className="p-3 font-mono text-xs">{p.booking?.id || "—"}</td>
                    <td className="p-3">{p.provider}</td>
                    <td className="p-3">{money(p.amount)}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3">{money(p.refunded_amount)}</td>
                    <td className="p-3 space-x-2">
                      {["confirmed", "used"].includes(p.booking?.status) && (
                        <button
                          type="button"
                          disabled={print.isPending}
                          onClick={() => print.mutate(p.booking.id)}
                          className="rounded bg-yellow-500 px-2 py-1 font-semibold text-gray-950 disabled:opacity-60"
                        >
                          In vé
                        </button>
                      )}
                      {p.provider === "cash" && p.status === "pending" && (
                        <button
                          onClick={() => cash.mutate(p.id)}
                          className="rounded bg-blue-600 px-2 py-1 text-white"
                        >
                          Xác nhận cash
                        </button>
                      )}
                      {["partially_refunded", "refunded"].includes(p.status) ||
                      p.booking?.status !== "cancelled" ? null : (
                        <button
                          onClick={() => refund.mutate({ id: p.id })}
                          className="rounded bg-amber-600 px-2 py-1 text-white"
                        >
                          Hoàn toàn bộ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trước
            </button>
            <span>
              {page}/{Math.max(1, query.data.pagination.pages)}
            </span>
            <button
              disabled={page >= query.data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </main>
  );
}
