import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  Ticket,
  TicketCheck,
  TicketX,
  Undo2,
  Wallet,
  TrendingUp,
  CalendarClock
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminBookingService } from "../../services/adminBookingService";
import { queryKeys } from "../../services/queryKeys";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

const AdminDashboard = () => {
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const params = Object.fromEntries(Object.entries(range).filter(([, value]) => value));
  const statsQuery = useQuery({
    queryKey: queryKeys.admin.dashboard(params),
    queryFn: () => adminBookingService.getDashboardStats(params),
  });
  const stats = statsQuery.data;

  const cards = [
    {
      title: "Tổng booking",
      value: stats?.totalBookings,
      icon: Ticket,
      color: "from-blue-500 to-cyan-400",
      iconBg: "bg-blue-500/20",
      iconColor: "text-cyan-400"
    },
    {
      title: "Đã xác nhận",
      value: stats?.confirmedBookings,
      icon: TicketCheck,
      color: "from-green-500 to-emerald-400",
      iconBg: "bg-green-500/20",
      iconColor: "text-emerald-400",
    },
    {
      title: "Đã hủy",
      value: stats?.cancelledBookings,
      icon: TicketX,
      color: "from-red-500 to-rose-400",
      iconBg: "bg-red-500/20",
      iconColor: "text-rose-400",
    },
    {
      title: "Doanh thu thuần",
      value: money(stats?.revenue),
      icon: Wallet,
      color: "from-purple-500 to-indigo-400",
      iconBg: "bg-purple-500/20",
      iconColor: "text-indigo-400",
    },
    {
      title: "Đã hoàn tiền",
      value: money(stats?.refund),
      icon: Undo2,
      color: "from-amber-500 to-yellow-400",
      iconBg: "bg-amber-500/20",
      iconColor: "text-yellow-400",
    },
    {
      title: "Tỷ lệ lấp đầy",
      value: stats ? `${stats.occupancy}%` : undefined,
      icon: Armchair,
      color: "from-cyan-500 to-teal-400",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-teal-400",
    },
  ];

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Dashboard</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Tổng quan booking, doanh thu và công suất phòng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <DateFilter
              label="Từ ngày"
              value={range.dateFrom}
              onChange={(dateFrom) => setRange((current) => ({ ...current, dateFrom }))}
            />
            <DateFilter
              label="Đến ngày"
              value={range.dateTo}
              min={range.dateFrom}
              onChange={(dateTo) => setRange((current) => ({ ...current, dateTo }))}
            />
          </div>
        </div>

        {/* Error State */}
        {statsQuery.isError && (
          <div role="alert" className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 backdrop-blur-sm">
            <p className="font-medium">Không thể tải số liệu quản trị. Vui lòng thử lại.</p>
          </div>
        )}

        {/* Stat Cards Grid */}
        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ title, value, icon: Icon, color, iconBg, iconColor }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl bg-slate-900/80 p-6 border border-white/5 backdrop-blur-sm hover:border-white/10 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
                  <p className="mt-3 text-3xl font-bold text-slate-100">
                    {statsQuery.isPending ? (
                      <span className="inline-block w-16 h-8 bg-slate-800 rounded-lg animate-pulse"></span>
                    ) : (value ?? "—")}
                  </p>
                </div>
                <div className={`${iconBg} rounded-2xl p-3.5 shadow-inner border border-white/5`}>
                  <Icon className={`h-7 w-7 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Data & Chart Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">

          {/* Daily Stats Table */}
          <section className="overflow-hidden rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/5 p-5">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-200">Thống kê theo ngày</h2>
            </div>

            {statsQuery.isPending ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : stats?.series?.length ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-semibold">Ngày</th>
                      <th className="p-4 font-semibold">Booking</th>
                      <th className="p-4 font-semibold">Doanh thu</th>
                      <th className="p-4 font-semibold">Hoàn tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.series.map((item) => (
                      <tr key={item.date} className="group hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-300 font-medium">{item.date}</td>
                        <td className="p-4 text-slate-300">
                          <span className="inline-block bg-slate-800/50 px-2.5 py-1 rounded-lg text-xs font-mono border border-white/5">
                            {item.totalBookings}
                          </span>
                        </td>
                        <td className="p-4 text-emerald-400 font-medium">{money(item.revenue)}</td>
                        <td className="p-4 text-rose-400 font-medium">{money(item.refund)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-500">
                <Undo2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Chưa có dữ liệu trong khoảng thời gian này.</p>
              </div>
            )}
          </section>

          {/* Occupancy Card */}
          <aside className="rounded-2xl bg-slate-900/80 p-6 border border-white/5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-400">
                  <Armchair className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-200">Công suất ghế</h2>
              </div>

              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800 border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20"
                  style={{ width: `${Math.min(100, stats?.occupancy || 0)}%` }}
                />
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-400">Đã đặt</span>
                <span className="text-slate-200 font-bold">{stats?.bookedSeats || 0}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-2 mt-1">
                <span className="text-slate-400">Tổng ghế</span>
                <span className="text-slate-200 font-bold">{stats?.capacity || 0}</span>
              </div>
            </div>

            <Link
              to="/admin/bookings"
              className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-3 text-white font-semibold shadow-lg shadow-cyan-900/30 transition-all"
            >
              <TicketCheck className="w-5 h-5" /> Quản lý booking
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
};

const DateFilter = ({ label, onChange, ...props }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</span>
    <input
      {...props}
      type="date"
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
    />
  </label>
);

export default AdminDashboard;