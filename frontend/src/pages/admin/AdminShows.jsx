import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Edit, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { movieService } from "../../services/movieService";
import { queryKeys } from "../../services/queryKeys";
import { showService } from "../../services/showService";

const statusLabels = {
  scheduled: "Đã lên lịch",
  in_progress: "Đang chiếu",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
};

const AdminShows = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    movieId: "",
    theaterId: "",
    screenId: "",
    date: "",
    status: "",
  });
  const [actionError, setActionError] = useState("");
  const params = {
    page,
    limit: 20,
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  };

  const showsQuery = useQuery({
    queryKey: queryKeys.shows.adminList(params),
    queryFn: () => showService.getAdminShows(params),
  });
  const moviesQuery = useQuery({
    queryKey: queryKeys.movies.list({ page: 1, limit: 100 }),
    queryFn: () => movieService.getMovies({ page: 1, limit: 100 }),
  });
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.list,
    queryFn: catalogService.getCinemas,
  });
  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms.list({ cinemaId: filters.theaterId }),
    queryFn: () =>
      catalogService.getRooms(filters.theaterId ? { cinemaId: filters.theaterId } : {}),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.shows.all });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => showService.cancelShow(id, reason),
    onSuccess: refresh,
    onError: (error) => setActionError(error.message || "Không thể hủy suất chiếu."),
  });
  const deleteMutation = useMutation({
    mutationFn: showService.deleteShow,
    onSuccess: refresh,
    onError: (error) => setActionError(error.message || "Không thể xóa suất chiếu."),
  });

  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "theaterId" ? { screenId: "" } : {}),
    }));
  };

  const cancelShow = (show) => {
    const reason = window.prompt(`Nhập lý do hủy suất ${show.movie?.title || ""}:`);
    if (!reason) return;
    setActionError("");
    cancelMutation.mutate({ id: show.id, reason });
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Quản lý suất chiếu</h1>
        <Link
          to="/admin/shows/create"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" /> Thêm suất
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 dark:bg-gray-800 md:grid-cols-5">
        <FilterSelect
          label="Phim"
          value={filters.movieId}
          onChange={(value) => updateFilter("movieId", value)}
          options={moviesQuery.data?.data?.map((movie) => ({
            value: movie.id,
            label: movie.title,
          }))}
        />
        <FilterSelect
          label="Rạp"
          value={filters.theaterId}
          onChange={(value) => updateFilter("theaterId", value)}
          options={cinemasQuery.data?.map((cinema) => ({ value: cinema.id, label: cinema.name }))}
        />
        <FilterSelect
          label="Phòng"
          value={filters.screenId}
          onChange={(value) => updateFilter("screenId", value)}
          options={roomsQuery.data?.map((room) => ({ value: room.id, label: room.name }))}
        />
        <label>
          <span className="mb-1 block text-sm">Ngày</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => updateFilter("date", event.target.value)}
            className="w-full rounded-lg border p-2 dark:bg-gray-700"
          />
        </label>
        <FilterSelect
          label="Trạng thái"
          value={filters.status}
          onChange={(value) => updateFilter("status", value)}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <FormAlert message={actionError} />
      {showsQuery.isPending ? (
        <p role="status">Đang tải suất chiếu...</p>
      ) : showsQuery.isError ? (
        <p role="alert" className="text-red-500">
          Không thể tải danh sách suất chiếu.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
            <table className="min-w-[900px] w-full text-left">
              <thead>
                <tr>
                  <th className="p-4">Phim</th>
                  <th className="p-4">Rạp / phòng</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Giá</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {showsQuery.data.data.map((show) => (
                  <tr key={show.id} className="border-t dark:border-gray-700">
                    <td className="p-4 font-medium">{show.movie?.title || "—"}</td>
                    <td className="p-4">
                      {show.screen?.theater?.name || "—"} / {show.screen?.name || "—"}
                    </td>
                    <td className="p-4">
                      <div>{new Date(show.start_time).toLocaleString("vi-VN")}</div>
                      <div className="text-sm text-gray-500">
                        đến {new Date(show.end_time).toLocaleString("vi-VN")}
                      </div>
                    </td>
                    <td className="p-4">{show.price.toLocaleString("vi-VN")} ₫</td>
                    <td className="p-4">
                      <span>{statusLabels[show.status] || show.status}</span>
                      {show.cancellation_reason && (
                        <p className="mt-1 max-w-xs text-xs text-red-400">
                          {show.cancellation_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        {show.status === "scheduled" && (
                          <>
                            <Link
                              to={`/admin/shows/edit/${show.id}`}
                              aria-label={`Sửa suất ${show.movie?.title || ""}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              aria-label={`Hủy suất ${show.movie?.title || ""}`}
                              onClick={() => cancelShow(show)}
                              disabled={cancelMutation.isPending}
                            >
                              <Ban className="h-4 w-4 text-amber-500" />
                            </button>
                          </>
                        )}
                        {(show.status === "scheduled" || show.status === "cancelled") && (
                          <button
                            type="button"
                            aria-label={`Xóa suất ${show.movie?.title || ""}`}
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Chỉ có thể xóa suất chưa từng có booking. Tiếp tục?",
                                )
                              ) {
                                setActionError("");
                                deleteMutation.mutate(show.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showsQuery.data.data.length === 0 && (
            <p className="py-8 text-center text-gray-500">Không có suất chiếu phù hợp.</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Trước
            </button>
            <span>
              Trang {page}/{Math.max(1, showsQuery.data.pagination.pages)}
            </span>
            <button
              type="button"
              disabled={page >= showsQuery.data.pagination.pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}
    </main>
  );
};

const FilterSelect = ({ label, value, onChange, options = [] }) => (
  <label>
    <span className="mb-1 block text-sm">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border p-2 dark:bg-gray-700"
    >
      <option value="">Tất cả</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export default AdminShows;
