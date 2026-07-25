import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, XCircle, Search, Calendar, Ticket, User, Film, Building2, CreditCard, RotateCcw } from "lucide-react";
import AccessibleDialog from "../../components/common/AccessibleDialog";
import FormAlert from "../../components/common/FormAlert";
import { adminBookingService } from "../../services/adminBookingService";
import { getApiErrorMessage } from "../../services/apiError";
import { catalogService } from "../../services/catalogService";
import { movieService } from "../../services/movieService";
import { queryKeys } from "../../services/queryKeys";

const bookingStatuses = {
  pending_payment: "Chờ thanh toán",
  expired: "Đã hết hạn",
  used: "Đã check-in",
  pending: "Đang xử lý",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
};
const paymentStatuses = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  cancelled: "Đã hủy",
  partially_refunded: "Hoàn một phần",
  refunded: "Đã hoàn tiền",
};

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

const AdminBookings = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    movieId: "",
    cinemaId: "",
    dateFrom: "",
    dateTo: "",
  });
  const params = {
    page,
    limit: 20,
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  };

  const bookingsQuery = useQuery({
    queryKey: queryKeys.admin.bookings.list(params),
    queryFn: () => adminBookingService.getBookings(params),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.bookings.detail(selectedId),
    queryFn: () => adminBookingService.getBookingById(selectedId),
    enabled: Boolean(selectedId),
  });
  const moviesQuery = useQuery({
    queryKey: queryKeys.movies.list({ page: 1, limit: 100 }),
    queryFn: () => movieService.getMovies({ page: 1, limit: 100 }),
  });
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.list,
    queryFn: catalogService.getCinemas,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => adminBookingService.cancelBooking(id, reason),
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.bookings.all });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Không thể hủy booking.")),
  });

  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };
  const cancelBooking = (booking) => {
    const reason = window.prompt(`Nhập lý do hủy booking ${booking.id}:`);
    if (!reason) return;
    cancelMutation.mutate({ id: booking.id, reason });
  };

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý booking</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Theo dõi, tìm kiếm và quản lý toàn bộ đơn đặt vé của khách hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar - Hiện đại */}
        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl bg-slate-900/80 border border-white/5 p-4 backdrop-blur-sm shadow-xl items-end">
          <FilterInput
            label="Tìm kiếm"
            icon={Search}
            value={filters.search}
            onChange={(value) => updateFilter("search", value)}
            placeholder="Mã booking, tên, email, phim..."
            className="min-w-[180px] flex-1"
          />
          <FilterSelect
            label="Trạng thái"
            icon={Ticket}
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={bookingStatuses}
          />
          <FilterSelect
            label="Thanh toán"
            icon={CreditCard}
            value={filters.paymentStatus}
            onChange={(value) => updateFilter("paymentStatus", value)}
            options={paymentStatuses}
          />
          <FilterSelect
            label="Phim"
            icon={Film}
            value={filters.movieId}
            onChange={(value) => updateFilter("movieId", value)}
            options={Object.fromEntries(
              moviesQuery.data?.data?.map((movie) => [movie.id, movie.title]) || [],
            )}
          />
          <FilterSelect
            label="Rạp"
            icon={Building2}
            value={filters.cinemaId}
            onChange={(value) => updateFilter("cinemaId", value)}
            options={Object.fromEntries(
              cinemasQuery.data?.map((cinema) => [cinema.id, cinema.name]) || [],
            )}
          />
          <FilterInput
            label="Từ ngày"
            icon={Calendar}
            type="date"
            value={filters.dateFrom}
            onChange={(value) => updateFilter("dateFrom", value)}
            className="min-w-[140px]"
          />
          <FilterInput
            label="Đến ngày"
            icon={Calendar}
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom}
            onChange={(value) => updateFilter("dateTo", value)}
            className="min-w-[140px]"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setFilters({
                search: "",
                status: "",
                paymentStatus: "",
                movieId: "",
                cinemaId: "",
                dateFrom: "",
                dateTo: "",
              });
            }}
            className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:border-red-500/30 hover:text-red-400 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Xóa bộ lọc
          </button>
        </div>

        <FormAlert message={actionError} />

        {/* Main Table */}
        {bookingsQuery.isPending ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-slate-400 font-medium">Đang tải danh sách booking...</p>
            </div>
          </div>
        ) : bookingsQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải danh sách booking. Vui lòng thử lại.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[1000px] w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Mã</th>
                      <th className="px-6 py-4 font-semibold">Khách hàng</th>
                      <th className="px-6 py-4 font-semibold">Phim / Suất</th>
                      <th className="px-6 py-4 font-semibold">Tổng tiền</th>
                      <th className="px-6 py-4 font-semibold text-center">Booking</th>
                      <th className="px-6 py-4 font-semibold text-center">Thanh toán</th>
                      <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookingsQuery.data.data.map((booking) => (
                      <tr key={booking.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-lg bg-slate-800/50 px-2 py-1 font-mono text-xs text-slate-200 border border-white/5">
                            {booking.id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                {booking.user?.name || "—"}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">{booking.user?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-200">{booking.show?.movie?.title || "—"}</span>
                            <span className="text-xs text-slate-500">
                              {booking.show?.start_time
                                ? new Date(booking.show.start_time).toLocaleString("vi-VN")
                                : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-400">{money(booking.total_price)}</span>
                            {booking.refunded_amount > 0 && (
                              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full inline-block w-fit mt-0.5">
                                Hoàn {money(booking.refunded_amount)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge label={bookingStatuses[booking.status]} value={booking.status} type="booking" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge label={paymentStatuses[booking.payment_status]} value={booking.payment_status} type="payment" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              aria-label={`Xem booking ${booking.id}`}
                              onClick={() => setSelectedId(booking.id)}
                              className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 transition-all"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {booking.status !== "cancelled" && (
                              <button
                                type="button"
                                aria-label={`Hủy booking ${booking.id}`}
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelBooking(booking)}
                                className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <XCircle className="h-4 w-4" />
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
            {bookingsQuery.data.data.length === 0 && (
              <div className="mt-6 rounded-2xl bg-slate-900/80 border border-white/5 p-12 text-center text-slate-500 backdrop-blur-sm">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Không có booking phù hợp với bộ lọc.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-400">
              <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
                Trang {page}/{Math.max(1, bookingsQuery.data.pagination.pages)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-blue-500/30 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="px-3 py-1 font-mono text-slate-500">
                  {page}/{Math.max(1, bookingsQuery.data.pagination.pages)}
                </span>
                <button
                  type="button"
                  disabled={page >= bookingsQuery.data.pagination.pages}
                  onClick={() => setPage((current) => current + 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-blue-500/30 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedId && (
        <AccessibleDialog
          id="admin-booking-detail"
          title="Chi tiết booking"
          onClose={() => setSelectedId(null)}
        >
          <BookingDetail query={detailQuery} onClose={() => setSelectedId(null)} />
        </AccessibleDialog>
      )}
    </main>
  );
};

// ----------------- COMPONENT BOOKING DETAIL ----------------- //

const BookingDetail = ({ query, onClose }) => {
  if (query.isPending) return <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div></div>;
  if (query.isError) return <p role="alert" className="text-red-400">Không thể tải chi tiết booking.</p>;
  const booking = query.data;
  const seats = booking.bookingSeats
    .map(({ seat }) => (seat ? `${seat.row}${seat.number}` : null))
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Detail label="Mã booking" value={booking.id} mono className="md:col-span-2" />
        <Detail
          label="Khách hàng"
          value={`${booking.user?.name || "—"} • ${booking.user?.email || "—"}`}
        />
        <Detail label="Phim" value={booking.show?.movie?.title || "—"} />
        <Detail
          label="Rạp / phòng"
          value={`${booking.show?.screen?.theater?.name || "—"} / ${booking.show?.screen?.name || "—"}`}
        />
        <Detail label="Ghế" value={seats || "—"} />
        <Detail label="Tổng tiền" value={money(booking.total_price)} />
        <Detail label="Đã hoàn" value={money(booking.refunded_amount)} />
        <Detail
          label="Thanh toán"
          value={paymentStatuses[booking.payment_status] || booking.payment_status}
        />
        {booking.cancellation_reason && (
          <Detail label="Lý do hủy" value={booking.cancellation_reason} className="md:col-span-2" />
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2.5 font-medium text-slate-200 transition-all"
      >
        Đóng
      </button>
    </div>
  );
};

const Detail = ({ label, value, mono, className }) => (
  <div className={`bg-slate-800/50 rounded-xl p-3 border border-white/5 ${className || ""}`}>
    <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
    <span className={`block mt-1 ${mono ? "font-mono text-xs break-all" : "text-slate-200 font-medium"}`}>{value}</span>
  </div>
);

// ----------------- COMPONENT STATUS BADGE ----------------- //

const StatusBadge = ({ label, value, type }) => {
  // Booking status colors
  const bookingStyles = {
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    used: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    pending_payment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    expired: "bg-gray-500/10 text-slate-400 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  // Payment status colors
  const paymentStyles = {
    paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-gray-500/10 text-slate-400 border-gray-500/20",
    partially_refunded: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    refunded: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const styles = type === "booking" ? bookingStyles : paymentStyles;

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${styles[value] || "bg-slate-800/50 text-slate-400 border-slate-700/50"}`}>
      {label || value || "—"}
    </span>
  );
};

// ----------------- COMPONENT FILTER INPUT & SELECT ----------------- //

const FilterInput = ({ label, icon: Icon, className, onChange, ...props }) => (
  <label className={`flex flex-col gap-1 relative group ${className || ""}`}>
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <input
      {...props}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
    />
  </label>
);

const FilterSelect = ({ label, icon: Icon, value, onChange, options }) => (
  <label className="flex flex-col gap-1 min-w-[140px] relative group">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
    >
      <option value="">Tất cả</option>
      {Object.entries(options).map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </label>
);

export default AdminBookings;