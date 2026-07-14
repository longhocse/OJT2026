import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Armchair, Ticket, TicketCheck, TicketX, Undo2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { adminBookingService } from "../../services/adminBookingService";
import { queryKeys } from "../../services/queryKeys";
import { useSelector } from "react-redux";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

const AdminDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === "admin";
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const params = Object.fromEntries(Object.entries(range).filter(([, value]) => value));
  const statsQuery = useQuery({
    queryKey: queryKeys.admin.dashboard(params),
    queryFn: () => adminBookingService.getDashboardStats(params),
  });
  const stats = statsQuery.data;
  const cards = [
    { title: "Tổng booking", value: stats?.totalBookings, icon: Ticket, color: "bg-blue-600" },
    {
      title: "Đã xác nhận",
      value: stats?.confirmedBookings,
      icon: TicketCheck,
      color: "bg-green-600",
    },
    {
      title: "Đã hủy",
      value: stats?.cancelledBookings,
      icon: TicketX,
      color: "bg-red-600",
    },
    {
      title: "Doanh thu thuần",
      value: money(stats?.revenue),
      icon: Wallet,
      color: "bg-purple-600",
    },
    { title: "Đã hoàn tiền", value: money(stats?.refund), icon: Undo2, color: "bg-amber-600" },
    {
      title: "Tỷ lệ lấp đầy",
      value: stats ? `${stats.occupancy}%` : undefined,
      icon: Armchair,
      color: "bg-cyan-600",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? "Admin Dashboard" : "Manager Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? "Bảng điều khiển dành cho quản trị viên."
              : "Bảng điều khiển dành cho quản lý rạp."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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

      {statsQuery.isError && (
        <p role="alert" className="mb-6 rounded-lg bg-red-500/10 p-4 text-red-400">
          Không thể tải số liệu quản trị. Vui lòng thử lại.
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, color }) => (
          <div key={title} className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="mt-2 text-2xl font-bold">
                  {statsQuery.isPending ? "…" : (value ?? "—")}
                </p>
              </div>
              <div className={`${color} rounded-lg p-3 text-white`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
          <div className="border-b p-5 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Thống kê theo ngày</h2>
          </div>
          {statsQuery.isPending ? (
            <p role="status" className="p-6">
              Đang tải thống kê...
            </p>
          ) : stats?.series?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr>
                    <th className="p-4">Ngày</th>
                    <th className="p-4">Booking</th>
                    <th className="p-4">Doanh thu</th>
                    <th className="p-4">Hoàn tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.series.map((item) => (
                    <tr key={item.date} className="border-t dark:border-gray-700">
                      <td className="p-4">{item.date}</td>
                      <td className="p-4">{item.totalBookings}</td>
                      <td className="p-4">{money(item.revenue)}</td>
                      <td className="p-4 text-red-400">{money(item.refund)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-gray-500">Chưa có dữ liệu trong khoảng thời gian này.</p>
          )}
        </section>

        <aside className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
          <h2 className="text-xl font-semibold">Công suất ghế</h2>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-cyan-500"
              style={{ width: `${Math.min(100, stats?.occupancy || 0)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {stats?.bookedSeats || 0} ghế đã đặt trên {stats?.capacity || 0} ghế có thể bán.
          </p>
          <Link
            to="/admin/bookings"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Quản lý booking
          </Link>
        </aside>
      </div>
    </main>
  );
};

const DateFilter = ({ label, onChange, ...props }) => (
  <label>
    <span className="mb-1 block text-xs text-gray-500">{label}</span>
    <input
      {...props}
      type="date"
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border p-2 dark:bg-gray-700"
    />
  </label>
);

export default AdminDashboard;
