import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, MapPin, Monitor, Phone, Plus, Power, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const statusLabels = {
  all: "Tất cả",
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
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý chi nhánh rạp</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo/sửa chi nhánh, xem số phòng, ngưng hoạt động hoặc khôi phục khi cần.
          </p>
        </div>
        <Link
          to="/admin/cinemas/create"
          className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Thêm chi nhánh
        </Link>
      </div>

      <section className="mb-5 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-gray-800 md:grid-cols-[1fr_220px]">
        <input
          aria-label="Tìm chi nhánh"
          value={filters.search}
          onChange={(event) => setFilter("search", event.target.value)}
          placeholder="Tìm theo tên, địa chỉ, thành phố, số điện thoại"
          className="rounded-lg border p-2 dark:bg-gray-700"
        />
        <select
          aria-label="Trạng thái chi nhánh"
          value={filters.status}
          onChange={(event) => setFilter("status", event.target.value)}
          className="rounded-lg border p-2 dark:bg-gray-700"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>

      <FormAlert message={notice} />

      {cinemasQuery.isPending ? (
        <p role="status">Đang tải chi nhánh...</p>
      ) : cinemasQuery.isError ? (
        <p role="alert" className="text-red-500">
          Không thể tải danh sách chi nhánh.
        </p>
      ) : cinemas.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 dark:bg-gray-800">
          Chưa có chi nhánh nào khớp bộ lọc.
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cinemas.map((cinema) => (
              <article
                key={cinema.id}
                className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{cinema.name}</h2>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          cinema.is_active
                            ? "bg-green-500/15 text-green-400"
                            : "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        {cinema.is_active ? "Đang hoạt động" : "Đã ngưng"}
                      </span>
                    </div>
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      {cinema.address || "Chưa cập nhật địa chỉ"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {cinema.city || "Chưa cập nhật thành phố"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="h-4 w-4" />
                      {cinema.phone || "Chưa có số điện thoại"}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to={`/admin/cinemas/edit/${cinema.id}`}
                      aria-label={`Sửa ${cinema.name}`}
                      title="Sửa chi nhánh"
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
                      >
                        <Power className="h-4 w-4 text-amber-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Khôi phục ${cinema.name}`}
                        title="Khôi phục"
                        disabled={isMutating}
                        onClick={() => restoreMutation.mutate(cinema.id)}
                      >
                        <RotateCcw className="h-4 w-4 text-green-400" />
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
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 dark:border-gray-700">
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <Monitor className="h-4 w-4" />
                    {cinema.screens.length} phòng chiếu
                  </p>
                  <Link
                    to={`/admin/rooms?cinemaId=${cinema.id}`}
                    className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Xem phòng
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <span className="mr-auto text-sm text-gray-500">Tổng {pagination.total} chi nhánh</span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Trước
            </button>
            <span>
              {pagination.page}/{pagination.pages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}
    </main>
  );
};

export default AdminCinemas;
