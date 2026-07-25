import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  ScanLine, Upload, Camera, XCircle, CheckCircle, Printer,
  Wallet, CreditCard, Search, RotateCcw
} from "lucide-react";
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
      body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .page { width: 760px; margin: 24px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
      .header { display: flex; justify-content: space-between; gap: 24px; padding: 26px 32px; color: #ffffff; background: linear-gradient(135deg, #111827, #1f2937); }
      .brand { color: #facc15; font-size: 28px; font-weight: 800; letter-spacing: 0.04em; }
      .ticket-code { margin-top: 8px; font-family: "Courier New", monospace; font-size: 13px; color: #d1d5db; }
      .status { align-self: flex-start; border: 1px solid rgba(250, 204, 21, 0.55); border-radius: 999px; padding: 8px 14px; color: #facc15; font-weight: 700; text-transform: uppercase; }
      .content { display: grid; grid-template-columns: 1fr 220px; gap: 28px; padding: 30px 32px; }
      h1 { margin: 0 0 10px; font-size: 30px; }
      .meta { margin: 0 0 22px; color: #4b5563; font-size: 15px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .field { border-top: 1px solid #e5e7eb; padding-top: 12px; }
      .label { color: #6b7280; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
      .value { margin-top: 5px; font-size: 16px; font-weight: 700; }
      .qr-box { align-self: start; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; text-align: center; }
      .qr-box img { width: 170px; height: 170px; }
      .qr-caption { margin-top: 10px; color: #4b5563; font-size: 12px; }
      .footer { border-top: 1px dashed #d1d5db; padding: 18px 32px 26px; color: #6b7280; font-size: 12px; }
      .actions { margin: 18px auto 0; width: 760px; text-align: right; }
      button { cursor: pointer; border: 0; border-radius: 10px; background: #d4af37; color: #111827; font-weight: 800; padding: 12px 18px; }
      @media print { body { background: #ffffff; } .page { width: 100%; margin: 0; border: 0; border-radius: 0; } .actions { display: none; } }
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
          ${qrImageUrl ? `<img alt="QR vé" src="${qrImageUrl}" />` : `<div style="height:170px;display:grid;place-items:center;color:#6b7280">Không có QR</div>`}
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
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Thanh toán & Check-in</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Quản lý thanh toán, hoàn tiền, in vé và check-in khách hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl bg-slate-900/80 border border-white/5 p-4 backdrop-blur-sm shadow-xl items-end">
          <div className="flex-1 min-w-[180px] relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input
              aria-label="Tìm payment"
              placeholder="Email, phim, mã booking..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 pl-9 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <FilterSelect
            label="Trạng thái"
            icon={Wallet}
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            options={statuses}
          />
          <FilterSelect
            label="Provider"
            icon={Camera}
            value={filters.provider}
            onChange={(e) => setFilter("provider", e.target.value)}
            options={["mock", "cash", "legacy"]}
          />
        </div>

        {/* Check-in Scanner Card - Nổi bật */}
        <section className="mb-8 rounded-2xl bg-slate-900/80 border border-white/5 p-6 backdrop-blur-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <ScanLine className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-200">Quét QR / Check-in vé</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Quét camera laptop, tải ảnh QR chụp từ điện thoại, hoặc dán payload thủ công.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Camera className="w-4 h-4" /> Bật camera
              </button>
              <label className="flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2.5 font-semibold text-slate-200 cursor-pointer transition-all">
                <Upload className="w-4 h-4" /> Tải ảnh QR
                <input type="file" accept="image/*" onChange={handleUploadQr} className="sr-only" />
              </label>
              {cameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <XCircle className="w-4 h-4" /> Tắt camera
                </button>
              )}
            </div>

            {cameraActive && (
              <video
                ref={videoRef}
                muted
                playsInline
                className="mt-4 aspect-video max-h-80 w-full rounded-xl bg-black/80 border border-white/5 object-contain"
              />
            )}
            {scanNotice && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
                {scanNotice}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <textarea
                aria-label="QR payload"
                value={qrPayload}
                onChange={(e) => setQrPayload(e.target.value)}
                rows="2"
                placeholder="Dán payload trong QR nếu không quét được..."
                className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
              />
              <button
                type="button"
                disabled={!qrPayload.trim() || checkIn.isPending}
                onClick={() => submitPayload()}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {checkIn.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {checkIn.isPending ? "Đang check-in..." : "Check-in vé"}
              </button>
            </div>

            {checkInResult && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="flex items-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  {checkInResult.alreadyCheckedIn ? "Vé đã check-in trước đó" : "Check-in thành công"}
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                    <span className="text-xs text-slate-500">Mã vé</span>
                    <p className="font-mono font-medium">{checkInResult.ticketCode || "—"}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                    <span className="text-xs text-slate-500">Trạng thái</span>
                    <p className="font-medium">{checkInResult.status || "—"}</p>
                  </div>
                  {checkInResult.checkedInAt && (
                    <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5 sm:col-span-2">
                      <span className="text-xs text-slate-500">Thời gian check-in</span>
                      <p className="font-medium">{checkInResult.checkedInAt}</p>
                    </div>
                  )}
                </div>
                {checkInResult.booking && (
                  <button
                    type="button"
                    onClick={printCurrentTicket}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 font-semibold text-gray-950 transition-all"
                  >
                    <Printer className="w-4 h-4" /> In vé / Lưu PDF
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <FormAlert message={notice} />

        {/* Main Table */}
        {query.isPending ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              <p className="text-slate-400 font-medium">Đang tải danh sách thanh toán...</p>
            </div>
          </div>
        ) : query.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải danh sách thanh toán.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[900px] w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Booking</th>
                      <th className="px-6 py-4 font-semibold">Provider</th>
                      <th className="px-6 py-4 font-semibold">Số tiền</th>
                      <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                      <th className="px-6 py-4 font-semibold text-center">Hoàn</th>
                      <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {query.data.data.map((p) => (
                      <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-lg bg-slate-800/50 px-2 py-1 font-mono text-xs text-slate-200 border border-white/5">
                            {p.booking?.id ? `${p.booking.id.slice(0, 8)}…` : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${p.provider === "mock" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            p.provider === "cash" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-slate-700/50 text-slate-400 border-slate-700/50"
                            }`}>
                            {p.provider === "mock" ? <CreditCard className="w-3 h-3" /> :
                              p.provider === "cash" ? <Wallet className="w-3 h-3" /> : null}
                            {p.provider}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-emerald-400">{money(p.amount)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            p.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              p.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                p.status === "cancelled" ? "bg-gray-500/10 text-slate-400 border-gray-500/20" :
                                  "bg-slate-700/50 text-slate-400 border-slate-700/50"
                            }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.refunded_amount > 0 ? (
                            <span className="text-red-400 font-medium">{money(p.refunded_amount)}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {["confirmed", "used"].includes(p.booking?.status) && (
                              <button
                                type="button"
                                disabled={print.isPending}
                                onClick={() => print.mutate(p.booking.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                              >
                                <Printer className="w-3.5 h-3.5" /> In vé
                              </button>
                            )}
                            {p.provider === "cash" && p.status === "pending" && (
                              <button
                                onClick={() => cash.mutate(p.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Xác nhận
                              </button>
                            )}
                            {["partially_refunded", "refunded"].includes(p.status) ||
                              p.booking?.status !== "cancelled" ? null : (
                              <button
                                onClick={() => refund.mutate({ id: p.id })}
                                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Hoàn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Empty State */}
            {query.data.data.length === 0 && (
              <div className="mt-6 rounded-2xl bg-slate-900/80 border border-white/5 p-12 text-center text-slate-500 backdrop-blur-sm">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Không có bản ghi thanh toán phù hợp.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-400">
              <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
                Trang {page}/{Math.max(1, query.data.pagination.pages)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="px-3 py-1 font-mono text-slate-500">
                  {page}/{Math.max(1, query.data.pagination.pages)}
                </span>
                <button
                  type="button"
                  disabled={page >= query.data.pagination.pages}
                  onClick={() => setPage((current) => current + 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ----------------- COMPONENT FILTER SELECT ----------------- //

const FilterSelect = ({ label, icon: Icon, value, onChange, options = [] }) => (
  <label className="flex flex-col gap-1 min-w-[140px] relative group">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all"
    >
      <option value="">Mọi {label.toLowerCase()}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </label>
);

