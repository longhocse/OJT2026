import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Edit, Plus, Trash2, CalendarClock, Film, Building2, Monitor, Calendar } from "lucide-react";
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
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <CalendarClock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý suất chiếu</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Tạo, chỉnh sửa, hủy hoặc xóa các suất chiếu phim trong hệ thống.
              </p>
            </div>
          </div>

          <Link
            to="/admin/shows/create"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Plus className="h-4 w-4" /> Thêm suất chiếu
          </Link>
        </div>

        {/* Filter Bar - Hiện đại */}
        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl bg-slate-900/80 border border-white/5 p-4 backdrop-blur-sm shadow-xl items-end">
          <FilterSelect
            label="Phim"
            icon={Film}
            value={filters.movieId}
            onChange={(value) => updateFilter("movieId", value)}
            options={moviesQuery.data?.data?.map((movie) => ({
              value: movie.id,
              label: movie.title,
            }))}
          />
          <FilterSelect
            label="Rạp"
            icon={Building2}
            value={filters.theaterId}
            onChange={(value) => updateFilter("theaterId", value)}
            options={cinemasQuery.data?.map((cinema) => ({ value: cinema.id, label: cinema.name }))}
          />
          <FilterSelect
            label="Phòng"
            icon={Monitor}
            value={filters.screenId}
            onChange={(value) => updateFilter("screenId", value)}
            options={roomsQuery.data?.map((room) => ({ value: room.id, label: room.name }))}
          />
          <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Ngày
            </span>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => updateFilter("date", event.target.value)}
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </label>
          <FilterSelect
            label="Trạng thái"
            icon={CalendarClock}
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          />
        </div>

        <FormAlert message={actionError} />

        {/* Main Table */}
        {showsQuery.isPending ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              <p className="text-slate-400 font-medium">Đang tải danh sách suất chiếu...</p>
            </div>
          </div>
        ) : showsQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải danh sách suất chiếu. Vui lòng thử lại.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[900px] w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Phim</th>
                      <th className="px-6 py-4 font-semibold">Rạp / Phòng</th>
                      <th className="px-6 py-4 font-semibold">Thời gian</th>
                      <th className="px-6 py-4 font-semibold">Giá</th>
                      <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                      <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {showsQuery.data.data.map((show) => (
                      <tr key={show.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {show.movie?.title || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-300">{show.screen?.theater?.name || "—"}</span>
                            <span className="text-xs text-slate-500">Phòng {show.screen?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">{new Date(show.start_time).toLocaleString("vi-VN")}</span>
                            <span className="text-xs text-slate-500">đến {new Date(show.end_time).toLocaleString("vi-VN")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-emerald-400">{show.price.toLocaleString("vi-VN")} ₫</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${show.status === "scheduled" ? "bg-blue-500/10 text-cyan-400 border-blue-500/20" :
                                show.status === "in_progress" ? "bg-green-500/10 text-emerald-400 border-green-500/20" :
                                  show.status === "completed" ? "bg-gray-500/10 text-slate-400 border-gray-500/20" :
                                    "bg-red-500/10 text-red-400 border-red-500/20"
                              }`}>
                              {statusLabels[show.status] || show.status}
                            </span>
                            {show.cancellation_reason && (
                              <span className="max-w-[120px] truncate text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                {show.cancellation_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {show.status === "scheduled" && (
                              <>
                                <Link
                                  to={`/admin/shows/edit/${show.id}`}
                                  aria-label={`Sửa suất ${show.movie?.title || ""}`}
                                  className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 transition-all"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                                <button
                                  type="button"
                                  aria-label={`Hủy suất ${show.movie?.title || ""}`}
                                  onClick={() => cancelShow(show)}
                                  disabled={cancelMutation.isPending}
                                  className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-white/5 hover:border-amber-500/30 transition-all"
                                >
                                  <Ban className="h-4 w-4" />
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
                                className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
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
            {showsQuery.data.data.length === 0 && (
              <div className="mt-6 rounded-2xl bg-slate-900/80 border border-white/5 p-12 text-center text-slate-500 backdrop-blur-sm">
                <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Không có suất chiếu phù hợp với bộ lọc.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-400">
              <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
                Trang {page}/{Math.max(1, showsQuery.data.pagination.pages)}
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
                  {page}/{Math.max(1, showsQuery.data.pagination.pages)}
                </span>
                <button
                  type="button"
                  disabled={page >= showsQuery.data.pagination.pages}
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
};

// ----------------- COMPONENT FILTER SELECT ----------------- //

const FilterSelect = ({ label, icon: Icon, value, onChange, options = [] }) => (
  <label className="flex flex-col gap-1 flex-1 min-w-[140px] relative group">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all"
      >
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </label>
);

export default AdminShows;