import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Camera, CheckCircle, History, Printer, ScanLine, Upload, XCircle } from "lucide-react";
import { checkerService } from "../../services/checkerService";
import { queryKeys } from "../../services/queryKeys";

const dateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const barcodeAvailable = () => typeof window !== "undefined" && "BarcodeDetector" in window;
const detectQr = async (source) => {
  if (!barcodeAvailable()) throw new Error("Trình duyệt chưa hỗ trợ đọc QR. Hãy dán payload thủ công.");
  const codes = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(source);
  if (!codes[0]?.rawValue) throw new Error("Không đọc được mã QR.");
  return codes[0].rawValue;
};

const printTicket = async (ticket) => {
  const booking = ticket.booking || {};
  const show = booking.show || {};
  const theater = show.screen?.theater || {};
  const seats = (booking.seats || []).map((seat) => seat.label).filter(Boolean).join(", ");
  const qr = ticket.qrPayload ? await QRCode.toDataURL(ticket.qrPayload, { width: 300, margin: 1 }) : "";
  const popup = window.open("", "_blank", "width=820,height=720");
  if (!popup) throw new Error("Trình duyệt đã chặn cửa sổ in.");
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Vé ${escapeHtml(ticket.ticketCode)}</title><style>body{font-family:Arial;background:#eee;padding:24px}.ticket{max-width:700px;margin:auto;background:#fff;border-radius:20px;overflow:hidden}.head{background:#111827;color:#fff;padding:24px}.brand{color:#facc15;font-size:26px;font-weight:800}.body{display:grid;grid-template-columns:1fr 220px;gap:24px;padding:28px}.row{padding:10px 0;border-bottom:1px solid #ddd}.label{font-size:11px;color:#666;text-transform:uppercase}.value{font-weight:700;margin-top:4px}img{width:200px}button{margin:20px;padding:12px 20px}@media print{body{background:#fff;padding:0}button{display:none}}</style></head><body><section class="ticket"><div class="head"><div class="brand">CINEMA NOIR</div><div>Mã vé: ${escapeHtml(ticket.ticketCode || "—")}</div></div><div class="body"><div><h1>${escapeHtml(show.movie?.title || "Vé xem phim")}</h1><div class="row"><div class="label">Cơ sở</div><div class="value">${escapeHtml(theater.name || "—")}</div></div><div class="row"><div class="label">Phòng / Ghế</div><div class="value">${escapeHtml(show.screen?.name || "—")} · ${escapeHtml(seats || "—")}</div></div><div class="row"><div class="label">Suất chiếu</div><div class="value">${escapeHtml(dateTime(show.start_time))}</div></div><div class="row"><div class="label">Khách hàng</div><div class="value">${escapeHtml(booking.user?.name || booking.user?.email || "—")}</div></div></div><div>${qr ? `<img src="${qr}" alt="QR vé">` : ""}</div></div></section><button onclick="window.print()">In vé</button></body></html>`);
  popup.document.close();
};

export default function CheckerPage() {
  const client = useQueryClient();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: queryKeys.checker.history({ page, limit: 20 }), queryFn: () => checkerService.getMyHistory({ page, limit: 20 }) });
  const checkIn = useMutation({
    mutationFn: checkerService.checkIn,
    onSuccess: (data) => { setResult(data); setPayload(""); setMessage(data.alreadyCheckedIn ? "Vé đã được quét trước đó." : "Soát vé thành công."); client.invalidateQueries({ queryKey: queryKeys.checker.all }); },
    onError: (error) => { setResult(null); setMessage(error.response?.data?.message || "Không thể soát vé."); },
  });
  const stopCamera = () => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOn(false); };
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  const submit = (value = payload) => { const clean = value.trim(); if (!clean || checkIn.isPending) return; setMessage(""); setResult(null); checkIn.mutate(clean); };
  const startCamera = async () => {
    setMessage("");
    if (!barcodeAvailable()) { setMessage("Trình duyệt chưa hỗ trợ quét QR bằng camera. Hãy tải ảnh hoặc dán payload."); return; }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream; setCameraOn(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const scan = async () => { if (!videoRef.current || !streamRef.current) return; try { const value = await detectQr(videoRef.current); stopCamera(); submit(value); } catch (_error) { timerRef.current = window.setTimeout(scan, 500); } };
      timerRef.current = window.setTimeout(scan, 500);
    } catch (error) { stopCamera(); setMessage(error.message || "Không mở được camera."); }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try { const bitmap = await createImageBitmap(file); const value = await detectQr(bitmap); bitmap.close?.(); submit(value); } catch (error) { setMessage(error.message || "Không đọc được ảnh QR."); }
  };
  return <main className="min-h-full bg-[#0B1120] p-4 text-slate-100 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl">
    <header className="mb-6 border-b border-white/5 pb-5"><p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Nhân viên soát vé</p><h1 className="mt-1 text-3xl font-extrabold">Quét và in vé QR</h1><p className="mt-1 text-sm text-slate-400">Chỉ chấp nhận vé thuộc cơ sở được phân công.</p></header>
    <section className="rounded-2xl border border-white/5 bg-slate-900/80 p-6 shadow-xl"><div className="mb-4 flex items-center gap-2"><ScanLine className="text-emerald-400"/><h2 className="text-lg font-bold">Quét vé</h2></div><div className="flex flex-wrap gap-3"><button type="button" onClick={startCamera} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold hover:bg-emerald-500"><Camera size={17}/> Bật camera</button><label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 font-semibold hover:bg-slate-600"><Upload size={17}/> Tải ảnh QR<input type="file" accept="image/*" onChange={upload} className="sr-only"/></label>{cameraOn && <button type="button" onClick={stopCamera} className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-red-400"><XCircle size={17}/> Tắt camera</button>}</div>{cameraOn && <video ref={videoRef} muted playsInline className="mt-4 aspect-video max-h-80 w-full rounded-xl bg-black object-contain"/>}<div className="mt-4 flex flex-col gap-3 sm:flex-row"><textarea value={payload} onChange={(e)=>setPayload(e.target.value)} rows="2" placeholder="Dán payload QR..." className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 p-3 font-mono text-xs outline-none focus:border-emerald-500"/><button type="button" disabled={!payload.trim()||checkIn.isPending} onClick={()=>submit()} className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold disabled:opacity-40">{checkIn.isPending?"Đang kiểm tra...":"Soát vé"}</button></div>{message && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm ${result&&!result.alreadyCheckedIn?"border-emerald-500/30 bg-emerald-500/10 text-emerald-300":"border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>{message}</p>}{result && <div className="mt-4 rounded-xl bg-slate-800/70 p-4"><div className="flex items-center gap-2 text-emerald-400"><CheckCircle size={19}/><strong>{result.ticketCode}</strong></div><p className="mt-2 text-sm text-slate-300">{result.booking?.show?.movie?.title} · {result.booking?.show?.screen?.name} · Ghế {(result.booking?.seats||[]).map(s=>s.label).join(", ")}</p><button type="button" onClick={()=>printTicket(result).catch(e=>setMessage(e.message))} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-950"><Printer size={17}/> In vé QR</button></div>}</section>
    <section className="mt-6 rounded-2xl border border-white/5 bg-slate-900/80 shadow-xl"><div className="flex items-center gap-2 border-b border-white/5 p-5"><History className="text-blue-400"/><h2 className="font-bold">Lịch sử quét của tôi</h2></div>{history.isPending?<p className="p-8 text-center text-slate-400">Đang tải lịch sử...</p>:history.isError?<p className="p-8 text-center text-red-400">Không tải được lịch sử.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-800/50 text-xs uppercase text-slate-400"><tr><th className="p-4">Thời gian</th><th className="p-4">Mã vé</th><th className="p-4">Phim</th><th className="p-4">Phòng / Ghế</th><th className="p-4">Kết quả</th></tr></thead><tbody className="divide-y divide-white/5">{(history.data?.data||[]).map(item=><tr key={item.id}><td className="p-4 text-slate-400">{dateTime(item.createdAt)}</td><td className="p-4 font-mono">{item.ticketCode||"—"}</td><td className="p-4">{item.movie||"—"}</td><td className="p-4">{item.screen||"—"} · {(item.seats||[]).join(", ")||"—"}</td><td className="p-4"><span className={item.alreadyCheckedIn?"text-amber-400":"text-emerald-400"}>{item.alreadyCheckedIn?"Đã quét trước đó":"Thành công"}</span></td></tr>)}{!history.data?.data?.length&&<tr><td colSpan="5" className="p-10 text-center text-slate-500">Bạn chưa quét vé nào.</td></tr>}</tbody></table></div>}{history.data?.pagination?.pages>1&&<div className="flex justify-end gap-3 border-t border-white/5 p-4"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Trước</button><span className="py-2 text-slate-400">{page}/{history.data.pagination.pages}</span><button disabled={page>=history.data.pagination.pages} onClick={()=>setPage(p=>p+1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Sau</button></div>}</section>
  </div></main>;
}
