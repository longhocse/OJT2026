import React, { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CalendarDays, ChevronLeft, CreditCard, Film, MapPin, Printer } from "lucide-react";
import SeatMap from "../../components/booking/SeatMap";
import useSeatLock from "../../hooks/useSeatLock";
import { cashierService } from "../../services/cashierService";
import { printCashierTicket } from "./cashierTicket";
import { bookingSuccessStore } from "../../booking/bookingSession";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function CashierBookingPage() {
  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const shows = useQuery({
    queryKey: ["cashier", "shows"],
    queryFn: () => cashierService.getShows({ status: "scheduled", limit: 100 }),
  });
  const clearSelection = useCallback(() => setSelectedSeats([]), []);
  const lock = useSeatLock({
    showId: show?.id,
    seatIds: selectedSeats.map((seat) => seat.id),
    onConflict: () => { clearSelection(); setRefreshKey((value) => value + 1); setMessage("Ghế vừa được người khác giữ hoặc đặt. Vui lòng chọn lại."); },
    onExpired: () => { clearSelection(); setRefreshKey((value) => value + 1); setMessage("Thời gian giữ ghế đã hết. Vui lòng chọn lại."); },
    onError: () => setMessage("Không thể giữ ghế lúc này."),
  });
  const total = useMemo(() => selectedSeats.reduce((sum, seat) => {
    const factor = seat.type === "vip" ? 1.5 : seat.type === "couple" ? 1.8 : 1;
    return sum + Number(show?.price || 0) * factor;
  }, 0), [selectedSeats, show]);

  const chooseShow = (item) => { setShow(item); setSelectedSeats([]); setCompleted(null); setMessage(""); };
  const reset = () => { lock.release?.(); setShow(null); setSelectedSeats([]); setCompleted(null); setMessage(""); };
  const checkout = async (paymentMethod) => {
    if (!lock.selectionIsLocked || !lock.lock) { setMessage("Hãy chờ hệ thống giữ ghế trước khi thanh toán."); return; }
    setSubmitting(true); setMessage("");
    try {
      const result = await cashierService.createBooking({ showId: show.id, seatIds: selectedSeats.map((seat) => seat.id), lockToken: lock.lock.lockToken, paymentMethod });
      lock.markTransferred();
      if (paymentMethod === "payos") {
        if (!result.payment?.checkoutUrl) throw new Error("Không nhận được liên kết PayOS.");
        bookingSuccessStore.save({ ...result, cashierSale: true });
        window.location.assign(result.payment.checkoutUrl);
        return;
      }
      await cashierService.confirmCash(result.payment.id);
      const ticket = await cashierService.getTicket(result.bookingId);
      setCompleted(ticket);
      setMessage("Đã thu tiền mặt và xác nhận vé thành công.");
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || "Không thể hoàn tất booking.");
      setRefreshKey((value) => value + 1);
    } finally { setSubmitting(false); }
  };

  if (!show) return <div className="p-6 lg:p-8"><div className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Bán vé tại quầy</p><h1 className="text-3xl font-extrabold text-white">Chọn phim và suất chiếu</h1><p className="mt-1 text-slate-400">Chỉ hiển thị suất sắp chiếu tại cơ sở của bạn.</p></div>{shows.isPending?<p className="rounded-xl bg-slate-800 p-8 text-center text-slate-400">Đang tải suất chiếu...</p>:shows.isError?<p className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">Không tải được danh sách suất chiếu.</p>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(shows.data?.data||[]).map((item)=><button type="button" key={item.id} onClick={()=>chooseShow(item)} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-800/70 text-left transition hover:-translate-y-1 hover:border-cyan-400/50"><div className="flex gap-4 p-4">{item.movie?.poster_url?<img src={item.movie.poster_url} alt="" className="h-32 w-24 rounded-lg object-cover"/>:<div className="flex h-32 w-24 items-center justify-center rounded-lg bg-slate-700"><Film/></div>}<div><h2 className="font-bold text-white">{item.movie?.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-slate-400"><CalendarDays size={15}/>{new Date(item.start_time).toLocaleString("vi-VN")}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><MapPin size={15}/>{item.screen?.name}</p><p className="mt-3 font-bold text-cyan-400">Từ {money(item.price)}</p></div></div></button>)}{!shows.data?.data?.length&&<p className="col-span-full rounded-xl bg-slate-800 p-10 text-center text-slate-400">Cơ sở hiện chưa có suất chiếu sắp tới.</p>}</div>}</div>;

  return <div className="p-6 lg:p-8"><button type="button" onClick={reset} className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white"><ChevronLeft size={18}/> Chọn suất khác</button><div className="mb-5 rounded-2xl border border-white/10 bg-slate-800/70 p-5"><h1 className="text-2xl font-extrabold text-white">{show.movie?.title}</h1><p className="mt-2 text-slate-400">{new Date(show.start_time).toLocaleString("vi-VN")} · {show.screen?.theater?.name} · {show.screen?.name}</p></div>{message&&<p role="status" className="mb-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-200">{message}</p>}{completed?<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"><h2 className="text-2xl font-bold text-emerald-300">Booking thành công</h2><p className="mt-2 font-mono text-white">{completed.ticketCode}</p><button type="button" onClick={()=>printCashierTicket(completed).catch(e=>setMessage(e.message))} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"><Printer size={18}/> In vé QR</button></div>:<><div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4"><SeatMap showId={show.id} selectedSeats={selectedSeats} onSeatsSelected={setSelectedSeats} refreshKey={refreshKey}/></div><div className="sticky bottom-4 mt-5 rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">Ghế đã chọn</p><p className="font-bold text-white">{selectedSeats.map(s=>`${s.row}${s.number}`).join(", ")||"Chưa chọn ghế"}</p></div><div className="text-right"><p className="text-sm text-slate-400">Tổng tiền</p><p className="text-2xl font-extrabold text-cyan-400">{money(total)}</p></div></div><div className="grid gap-3 sm:grid-cols-2"><button disabled={!selectedSeats.length||submitting} onClick={()=>checkout("cash")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-40"><Banknote/> Xác nhận tiền mặt</button><button disabled={!selectedSeats.length||submitting} onClick={()=>checkout("payos")} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-40"><CreditCard/> Thanh toán PayOS</button></div></div></>}</div>;
}
