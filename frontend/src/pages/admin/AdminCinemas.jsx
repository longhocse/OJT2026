import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, MapPin, Monitor, Phone, Plus, Power, RotateCcw, Trash2, Building2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const statusLabels = {
  all: "Tất cả trạng thái",
  active: "Đang hoạt động",
  inactive: "Đã ngưng",
};

const AdminCinemas = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "active" });
  const [notice, setNotice] = useState("");
  const params = useMemo(
    () => ({
      page,
      limit: 12,
      status: filters.status,
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    }),
    [filters.search, filters.status, page],
  );
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.adminList(params),
    queryFn: () => catalogService.getAdminCinemas(params),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.cinemas.all });
  const deactivateMutation = useMutation({
    mutationFn: catalogService.deactivateCinema,
    onSuccess: async () => {
      setNotice("Đã ngưng hoạt động chi nhánh.");
      await refresh();
    },
    onError: (error) => setNotice(error.response?.data?.message || "Không thể ngưng chi nhánh."),
  });
  const restoreMutation = useMutation({
    mutationFn: catalogService.restoreCinema,
    onSuccess: async () => {
      setNotice("Đã khôi phục chi nhánh.");
      await refresh();
    },
    onError: (error) =>
      setNotice(error.response?.data?.message || "Không thể khôi phục chi nhánh."),
  });
  const deleteMutation = useMutation({
    mutationFn: catalogService.deleteCinema,
    onSuccess: async (data) => {
      if (data.code === "CINEMA_IN_USE_DEACTIVATED") {
        setNotice("Chi nhánh đang có phòng/suất chiếu nên đã được ngưng hoạt động thay vì xóa.");
      } else {
        setNotice("Đã xóa chi nhánh.");
      }
      await refresh();
    },
    onError: (error) => setNotice(error.response?.data?.message || "Không thể xóa chi nhánh."),
  });
  const setFilter = (name, value) => {
    setPage(1);
    setFilters((old) => ({ ...old, [name]: value }));
  };

  const isMutating =
    deactivateMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;
  const cinemas = cinemasQuery.data?.data || [];
  const pagination = cinemasQuery.data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý chi nhánh rạp</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Tạo/sửa chi nhánh, xem số phòng, ngưng hoạt động hoặc khôi phục khi cần.
              </p>
            </div>
          </div>

          <Link
            to="/admin/cinemas/create"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 px-5 py-2.5 font-semibold text-white shadow-lg shadow-orange-900/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Thêm chi nhánh
          </Link>
        </div>

        {/* Filter Bar - Modern Tech */}
        <section className="mb-8 flex flex-col md:flex-row gap-4 rounded-2xl bg-slate-900/80 border border-white/5 p-4 backdrop-blur-sm shadow-xl">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors" />
            <input
              aria-label="Tìm chi nhánh"
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Tìm theo tên, địa chỉ, thành phố, số điện thoại..."
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/50 focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
            />
          </div>

          <div className="w-full md:w-56 relative group">
            <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#A78BFA] transition-colors" />
            <select
              aria-label="Trạng thái chi nhánh"
              value={filters.status}
              onChange={(event) => setFilter("status", event.target.value)}
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#A78BFA]/50 focus:ring-2 focus:ring-[#A78BFA]/20 appearance-none transition-all"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <FormAlert message={notice} />

        {/* Main Content */}
        {cinemasQuery.isPending ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
              <p className="text-slate-400 font-medium">Đang tải chi nhánh...</p>
            </div>
          </div>
        ) : cinemasQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải danh sách chi nhánh. Vui lòng thử lại.
          </div>
        ) : cinemas.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/80 border border-white/5 p-12 text-center text-slate-500 backdrop-blur-sm">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Chưa có chi nhánh nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cinemas.map((cinema) => (
                <article
                  key={cinema.id}
                  className="group relative overflow-hidden rounded-2xl bg-slate-900/80 p-6 border border-white/5 backdrop-blur-sm hover:border-white/10 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300"
                >
                  {/* Background decoration blur */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cinema.is_active ? 'from-green-500/5 to-blue-500/5' : 'from-red-500/5 to-gray-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-100 group-hover:text-orange-400 transition-colors">{cinema.name}</h2>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${cinema.is_active
                                ? "bg-green-500/10 text-emerald-400 border-green-500/20"
                                : "bg-gray-500/10 text-slate-400 border-gray-500/20"
                              }`}
                          >
                            {cinema.is_active ? "Đang hoạt động" : "Đã ngưng"}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm text-slate-400">
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            {cinema.address || "Chưa cập nhật địa chỉ"}
                          </p>
                          <p className="flex items-center gap-2 ml-6 text-xs text-slate-500">
                            {cinema.city || "Chưa cập nhật thành phố"}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-500" />
                            {cinema.phone || "Chưa có số điện thoại"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Link
                          to={`/admin/cinemas/edit/${cinema.id}`}
                          aria-label={`Sửa ${cinema.name}`}
                          title="Sửa chi nhánh"
                          className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {cinema.is_active ? (
                          <button
                            type="button"
                            aria-label={`Ngưng ${cinema.name}`}
                            title="Ngưng hoạt động"
                            disabled={isMutating}
                            onClick={() =>
                              window.confirm("Ngưng hoạt động chi nhánh này?") &&
                              deactivateMutation.mutate(cinema.id)
                            }
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-white/5 hover:border-amber-500/30 transition-all"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Khôi phục ${cinema.name}`}
                            title="Khôi phục"
                            disabled={isMutating}
                            onClick={() => restoreMutation.mutate(cinema.id)}
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/30 transition-all"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Xóa ${cinema.name}`}
                          title="Xóa nếu chưa được sử dụng"
                          disabled={isMutating}
                          onClick={() =>
                            window.confirm(
                              "Xóa chi nhánh này? Nếu đã có phòng/suất chiếu, hệ thống sẽ ngưng hoạt động thay vì xóa cứng.",
                            ) && deleteMutation.mutate(cinema.id)
                          }
                          className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-white/5 hover:border-red-500/30 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm text-slate-400">
                        <Monitor className="h-4 w-4 text-slate-500" />
                        {cinema.screens.length} <span className="text-slate-500">phòng chiếu</span>
                      </p>
                      <Link
                        to={`/admin/rooms?cinemaId=${cinema.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-800/50 px-4 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                      >
                        Xem phòng <Monitor className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-400">
              <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
                Tổng cộng {pagination.total} chi nhánh
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="px-3 py-1 font-mono text-slate-500">
                  {pagination.page}/{pagination.pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((value) => value + 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

export default AdminCinemas;