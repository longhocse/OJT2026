import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Monitor, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const AdminCinemas = () => {
  const queryClient = useQueryClient();
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.list,
    queryFn: catalogService.getCinemas,
  });
  const deleteMutation = useMutation({
    mutationFn: catalogService.deleteCinema,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cinemas.all }),
  });

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý rạp</h1>
        <Link
          to="/admin/cinemas/create"
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Thêm rạp
        </Link>
      </div>
      {cinemasQuery.isPending ? (
        <p role="status">Đang tải rạp...</p>
      ) : cinemasQuery.isError ? (
        <p role="alert" className="text-red-500">
          Không thể tải danh sách rạp.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cinemasQuery.data.map((cinema) => (
            <article key={cinema.id} className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{cinema.name}</h2>
                  <p className="text-sm text-gray-500">
                    {cinema.address || "Chưa cập nhật địa chỉ"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {cinema.city || "Chưa cập nhật thành phố"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link to={`/admin/cinemas/edit/${cinema.id}`} aria-label={`Sửa ${cinema.name}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Xóa ${cinema.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      window.confirm("Bạn có chắc muốn xóa rạp này?") &&
                      deleteMutation.mutate(cinema.id)
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Monitor className="h-4 w-4" />
                {cinema.screens.length} phòng chiếu
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminCinemas;
