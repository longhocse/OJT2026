import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  RotateCcw,
  TicketCheck,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminBookingService } from "../../services/adminBookingService";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";
import useManagementBasePath from "../../hooks/useManagementBasePath";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

const toDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const dayOffset = (amount) => {
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return toDateInput(date);
};

const buildPreset = (key) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayValue = toDateInput(today);
  const presets = {
    yesterday: { dateFrom: dayOffset(-1), dateTo: dayOffset(-1) },
    today: { dateFrom: todayValue, dateTo: todayValue },
    week: { dateFrom: dayOffset(-6), dateTo: todayValue },
    month: { dateFrom: toDateInput(new Date(year, month, 1)), dateTo: todayValue },
    previousMonth: {
      dateFrom: toDateInput(new Date(year, month - 1, 1)),
      dateTo: toDateInput(new Date(year, month, 0)),
    },
    year: { dateFrom: `${year}-01-01`, dateTo: todayValue },
    previousYear: { dateFrom: `${year - 1}-01-01`, dateTo: `${year - 1}-12-31` },
    all: { dateFrom: "", dateTo: "" },
  };
  return presets[key];
};

const presets = [
  ["yesterday", "Hôm qua"],
  ["today", "Hôm nay"],
  ["week", "7 ngày"],
  ["month", "Tháng này"],
  ["previousMonth", "Tháng trước"],
  ["year", "Năm nay"],
  ["previousYear", "Năm trước"],
];

export default function AdminDashboard() {
  const basePath = useManagementBasePath();
  const [activePreset, setActivePreset] = useState("all");
  const [range, setRange] = useState(buildPreset("all"));
  const [draftRange, setDraftRange] = useState(range);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [cinemaId, setCinemaId] = useState("");
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.adminList({ page: 1, limit: 100 }),
    queryFn: async () => {
      try {
        const result = await catalogService.getAdminCinemas({ page: 1, limit: 100 });
        if (result.data.length > 0) return result;
      } catch (_error) {
        // Keep the dashboard selector usable if the admin cinema list is unavailable.
      }
      const data = await catalogService.getCinemas();
      return { data };
    },
  });
  const cinemas = cinemasQuery.data?.data || [];
  const selectedCinema = cinemas.find((cinema) => cinema.id === cinemaId);
  const params = useMemo(
    () => Object.fromEntries(Object.entries({ ...range, cinemaId }).filter(([, value]) => value)),
    [range, cinemaId]
  );
  const statsQuery = useQuery({
    queryKey: queryKeys.admin.dashboard(params),
    queryFn: () => adminBookingService.getDashboardStats(params),
  });
  const stats = statsQuery.data;

  const selectPreset = (key) => {
    const nextRange = buildPreset(key);
    setActivePreset(key);
    setRange(nextRange);
    setDraftRange(nextRange);
    setFilterOpen(false);
  };

  const applyCustomRange = () => {
    setRange(draftRange);
    setActivePreset("custom");
    setFilterOpen(false);
  };

  const pendingBookings = Math.max(
    0,
    (stats?.totalBookings || 0) - (stats?.confirmedBookings || 0) - (stats?.cancelledBookings || 0)
  );

  return (
    <main className="min-h-full bg-[#0B1120] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tổng quan</h1>
          <p className="mt-1 text-sm text-slate-400">Theo dõi doanh thu và tình trạng booking của MovieTap.</p>
        </header>

        <div className="relative mb-6 flex flex-wrap gap-2">
          {presets.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectPreset(key)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                activePreset === key
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-700 bg-slate-900/70 text-slate-400 hover:border-blue-500 hover:text-blue-300"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className={`flex items-center gap-1 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              activePreset === "all" || activePreset === "custom"
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-slate-700 bg-slate-900/70 text-slate-400"
            }`}
          >
            {activePreset === "custom" ? "Tùy chỉnh" : "Tất cả"}
            <ChevronDown size={16} />
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-12 z-20 w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:left-auto sm:right-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-100">Khoảng thời gian tùy chỉnh</p>
                  <p className="text-xs text-slate-400">Chọn ngày bắt đầu và kết thúc.</p>
                </div>
                <button type="button" onClick={() => selectPreset("all")} className="flex items-center gap-1 text-sm text-cyan-400">
                  <RotateCcw size={15} /> Đặt lại
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput label="Từ ngày" value={draftRange.dateFrom} onChange={(dateFrom) => setDraftRange((old) => ({ ...old, dateFrom }))} />
                <DateInput label="Đến ngày" value={draftRange.dateTo} min={draftRange.dateFrom} onChange={(dateTo) => setDraftRange((old) => ({ ...old, dateTo }))} />
              </div>
              <button type="button" onClick={applyCustomRange} className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 font-semibold text-white hover:from-cyan-500 hover:to-blue-500">
                Áp dụng
              </button>
            </div>
          )}
        </div>

        {statsQuery.isError && (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải số liệu quản trị. Vui lòng thử lại.
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Tổng doanh thu" value={money(stats?.revenue)} icon={Wallet} loading={statsQuery.isPending} primary />
          <SummaryCard title="Đơn đã hoàn thành" value={`${stats?.confirmedBookings || 0} booking`} icon={TicketCheck} loading={statsQuery.isPending} />
          <SummaryCard title="Tổng booking" value={stats?.totalBookings || 0} icon={CalendarDays} loading={statsQuery.isPending} />
          <SummaryCard title="Tỷ lệ lấp đầy" value={`${stats?.occupancy || 0}%`} icon={Armchair} loading={statsQuery.isPending} />
        </section>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 shadow-xl">
            <div className="relative mb-5 flex items-center justify-between gap-3">
              <div><h2 className="font-semibold">Doanh số các cơ sở</h2><p className="mt-1 text-xs text-slate-400">Theo khoảng thời gian đang chọn</p></div>
              <button type="button" onClick={() => setCinemaOpen((value) => !value)} className="flex max-w-[240px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 hover:border-blue-500/50">
                <Building2 size={16} className="shrink-0 text-blue-400" /><span className="truncate">{selectedCinema?.name || "Tất cả cơ sở"}</span><ChevronDown size={15} className={`shrink-0 transition ${cinemaOpen ? "rotate-180" : ""}`} />
              </button>
              {cinemaOpen && (
                <div className="absolute right-0 top-12 z-20 max-h-64 w-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                  <CinemaOption label="Tất cả cơ sở" active={!cinemaId} onClick={() => { setCinemaId(""); setCinemaOpen(false); }} />
                  {cinemas.map((cinema) => <CinemaOption key={cinema.id} label={cinema.name} active={cinema.id === cinemaId} onClick={() => { setCinemaId(cinema.id); setCinemaOpen(false); }} />)}
                  {!cinemasQuery.isPending && cinemas.length === 0 && <p className="p-3 text-sm text-slate-500">Chưa có cơ sở nào.</p>}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/60 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-500/15 text-blue-400"><Building2 size={21} /></div>
                <div>
                  <p className="text-xs text-slate-400">{cinemaId ? "Cơ sở đang xem" : "Toàn hệ thống"}</p>
                  <p className="font-semibold">{selectedCinema?.name || "Tất cả cơ sở"}</p>
                </div>
              </div>
              <strong className="text-emerald-400">{money(stats?.revenue)}</strong>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniMetric label="Đã hoàn tiền" value={money(stats?.refund)} />
              <MiniMetric label="Ghế đã đặt" value={`${stats?.bookedSeats || 0}/${stats?.capacity || 0}`} />
            </div>
          </section>

          <StatusDonut
            confirmed={stats?.confirmedBookings || 0}
            cancelled={stats?.cancelledBookings || 0}
            pending={pendingBookings}
            total={stats?.totalBookings || 0}
          />
        </div>

        <RevenueChart series={stats?.series || []} loading={statsQuery.isPending} />

        <div className="mt-6 flex justify-end">
          <Link to={`${basePath}/bookings`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:from-cyan-500 hover:to-blue-500">
            <TicketCheck size={18} /> Quản lý booking
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ title, value, icon: Icon, loading, primary = false }) {
  return (
    <article className={`relative overflow-hidden rounded-2xl border p-5 shadow-xl ${primary ? "border-blue-500/30 bg-gradient-to-br from-blue-600/30 to-cyan-500/10 text-white" : "border-white/5 bg-slate-900/80"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${primary ? "text-cyan-200" : "text-slate-400"}`}>{title}</p>
          {loading ? <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-700" /> : <p className={`mt-2 text-2xl font-bold ${primary ? "text-white" : "text-slate-100"}`}>{value}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${primary ? "bg-cyan-400/15 text-cyan-300" : "bg-blue-500/15 text-blue-400"}`}><Icon size={23} /></div>
      </div>
      {primary && <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-cyan-400/10" />}
    </article>
  );
}

function MiniMetric({ label, value }) {
  return <div className="rounded-xl bg-slate-800/60 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-100">{value}</p></div>;
}

function CinemaOption({ label, active, onClick }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-blue-600/20 text-blue-300" : "text-slate-300 hover:bg-white/5"}`}><span className="truncate">{label}</span>{active && <Check size={16} className="text-cyan-400" />}</button>;
}

function StatusDonut({ confirmed, cancelled, pending, total }) {
  const safeTotal = total || 1;
  const paidEnd = (confirmed / safeTotal) * 100;
  const cancelledEnd = paidEnd + (cancelled / safeTotal) * 100;
  const gradient = total
    ? `conic-gradient(#22d3ee 0 ${paidEnd}%, #8b5cf6 ${paidEnd}% ${cancelledEnd}%, #334155 ${cancelledEnd}% 100%)`
    : "conic-gradient(#334155 0 100%)";
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 shadow-xl">
      <h2 className="font-semibold">Thống kê trạng thái đơn</h2>
      <div className="mt-4 flex flex-col items-center justify-center gap-5 sm:flex-row">
        <div className="grid h-48 w-48 shrink-0 place-items-center rounded-full" style={{ background: gradient }}>
          <div className="grid h-28 w-28 place-items-center rounded-full bg-slate-900 text-center shadow-inner">
            <div><p className="text-xs text-slate-400">Tổng booking</p><p className="text-2xl font-bold text-slate-100">{total}</p></div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <Legend color="#22d3ee" label="Đã thanh toán" value={confirmed} />
          <Legend color="#8b5cf6" label="Đã hủy" value={cancelled} />
          <Legend color="#334155" label="Chờ thanh toán" value={pending} />
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label, value }) {
  return <div className="flex min-w-40 items-center justify-between gap-5"><span className="flex items-center gap-2 text-slate-400"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span><strong className="text-slate-100">{value}</strong></div>;
}

function RevenueChart({ series, loading }) {
  const maxRevenue = Math.max(1, ...series.map((item) => item.revenue || 0));
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div><h2 className="font-semibold">Biểu đồ doanh thu</h2><p className="text-xs text-slate-400">Doanh thu theo ngày trong khoảng đã chọn</p></div>
        <CircleDollarSign className="text-cyan-400" />
      </div>
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-800" />
      ) : series.length ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex h-64 min-w-[620px] items-end gap-3 border-b border-l border-slate-700 px-4 pt-4">
            {series.map((item) => (
              <div key={item.date} className="group flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-2" title={`${item.date}: ${money(item.revenue)}`}>
                <span className="hidden text-[10px] font-medium text-cyan-300 group-hover:block">{money(item.revenue)}</span>
                <div className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-opacity hover:opacity-80" style={{ height: `${Math.max(3, (item.revenue / maxRevenue) * 82)}%` }} />
                <span className="h-8 text-center text-[10px] text-slate-400">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="grid h-64 place-items-center rounded-xl bg-slate-800/50 text-sm text-slate-400">Chưa có doanh thu trong khoảng thời gian này.</div>}
    </section>
  );
}

function DateInput({ label, onChange, ...props }) {
  return <label className="text-sm text-slate-400"><span className="mb-1.5 block">{label}</span><input {...props} type="date" onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" /></label>;
}
