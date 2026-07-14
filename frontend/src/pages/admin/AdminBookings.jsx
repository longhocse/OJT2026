import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, XCircle } from "lucide-react";
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

  const currentUser = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (currentUser?.role === "manager" && currentUser?.theater_id) {
      setFilters((prev) => ({ ...prev, cinemaId: currentUser.theater_id }));
    }
  }, [currentUser]);

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
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Quản lý booking</h1>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 dark:bg-gray-800 md:grid-cols-4">
        <FilterInput
          label="Tìm kiếm"
          value={filters.search}
          onChange={(value) => updateFilter("search", value)}
          placeholder="Mã booking, khách hàng, email, phim..."
        />
        <FilterSelect
          label="Trạng thái booking"
          value={filters.status}
          onChange={(value) => updateFilter("status", value)}
          options={bookingStatuses}
        />
        <FilterSelect
          label="Thanh toán"
          value={filters.paymentStatus}
          onChange={(value) => updateFilter("paymentStatus", value)}
          options={paymentStatuses}
        />
        <FilterSelect
          label="Phim"
          value={filters.movieId}
          onChange={(value) => updateFilter("movieId", value)}
          options={Object.fromEntries(
            moviesQuery.data?.data?.map((movie) => [movie.id, movie.title]) || [],
          )}
        />
        {currentUser?.role === "manager" ? (
          <label>
            <span className="mb-1 block text-sm">Rạp</span>
            <input
              value={
                cinemasQuery.data?.find((c) => c.id === currentUser.theater_id)?.name || "Đang tải..."
              }
              readOnly
              className="w-full rounded-lg border p-2 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
          </label>
        ) : (
          <FilterSelect
            label="Rạp"
            value={filters.cinemaId}
            onChange={(value) => updateFilter("cinemaId", value)}
            options={Object.fromEntries(
              cinemasQuery.data?.map((cinema) => [cinema.id, cinema.name]) || [],
            )}
          />
        )}
        <FilterInput
          label="Từ ngày"
          type="date"
          value={filters.dateFrom}
          onChange={(value) => updateFilter("dateFrom", value)}
        />
        <FilterInput
          label="Đến ngày"
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom}
          onChange={(value) => updateFilter("dateTo", value)}
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
              cinemaId: currentUser?.role === "manager" ? currentUser.theater_id : "",
              dateFrom: "",
              dateTo: "",
            });
          }}
          className="self-end rounded-lg bg-gray-200 px-4 py-2 dark:bg-gray-700"
        >
          Xóa bộ lọc
        </button>
      </div>

      <FormAlert message={actionError} />
      {bookingsQuery.isPending ? (
        <p role="status">Đang tải booking...</p>
      ) : bookingsQuery.isError ? (
        <p role="alert" className="text-red-500">
          Không thể tải danh sách booking.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
            <table className="min-w-[1000px] w-full text-left">
              <thead>
                <tr>
                  <th className="p-4">Mã</th>
                  <th className="p-4">Khách hàng</th>
                  <th className="p-4">Phim / suất</th>
                  <th className="p-4">Tổng tiền</th>
                  <th className="p-4">Booking</th>
                  <th className="p-4">Thanh toán</th>
                  <th className="p-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookingsQuery.data.data.map((booking) => (
                  <tr key={booking.id} className="border-t dark:border-gray-700">
                    <td className="p-4 font-mono text-xs">{booking.id.slice(0, 8)}…</td>
                    <td className="p-4">
                      <div>{booking.user?.name || "—"}</div>
                      <div className="text-xs text-gray-500">{booking.user?.email}</div>
                    </td>
                    <td className="p-4">
                      <div>{booking.show?.movie?.title || "—"}</div>
                      <div className="text-xs text-gray-500">
                        {booking.show?.start_time
                          ? new Date(booking.show.start_time).toLocaleString("vi-VN")
                          : "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{money(booking.total_price)}</div>
                      {booking.refunded_amount > 0 && (
                        <div className="text-xs text-red-400">
                          Hoàn {money(booking.refunded_amount)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{bookingStatuses[booking.status] || booking.status}</td>
                    <td className="p-4">
                      {paymentStatuses[booking.payment_status] || booking.payment_status}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          aria-label={`Xem booking ${booking.id}`}
                          onClick={() => setSelectedId(booking.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {booking.status !== "cancelled" && (
                          <button
                            type="button"
                            aria-label={`Hủy booking ${booking.id}`}
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelBooking(booking)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookingsQuery.data.data.length === 0 && (
            <p className="py-8 text-center text-gray-500">Không có booking phù hợp.</p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Trước
            </button>
            <span>
              Trang {page}/{Math.max(1, bookingsQuery.data.pagination.pages)}
            </span>
            <button
              type="button"
              disabled={page >= bookingsQuery.data.pagination.pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}

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

const BookingDetail = ({ query, onClose }) => {
  if (query.isPending) return <p role="status">Đang tải chi tiết...</p>;
  if (query.isError) return <p role="alert">Không thể tải chi tiết booking.</p>;
  const booking = query.data;
  const seats = booking.bookingSeats
    .map(({ seat }) => (seat ? `${seat.row}${seat.number}` : null))
    .filter(Boolean)
    .join(", ");
  return (
    <div className="mt-4 space-y-3 text-sm">
      <Detail label="Mã booking" value={booking.id} mono />
      <Detail
        label="Khách hàng"
        value={`${booking.user?.name || "—"} — ${booking.user?.email || "—"}`}
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
        <Detail label="Lý do hủy" value={booking.cancellation_reason} />
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-lg bg-gray-200 px-4 py-2 dark:bg-gray-700"
      >
        Đóng
      </button>
    </div>
  );
};

const Detail = ({ label, value, mono }) => (
  <div>
    <span className="block text-gray-500">{label}</span>
    <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
  </div>
);

const FilterInput = ({ label, onChange, ...props }) => (
  <label>
    <span className="mb-1 block text-sm">{label}</span>
    <input
      {...props}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border p-2 dark:bg-gray-700"
    />
  </label>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <label>
    <span className="mb-1 block text-sm">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border p-2 dark:bg-gray-700"
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
