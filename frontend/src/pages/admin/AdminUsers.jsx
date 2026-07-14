import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const PAGE_SIZE = 20;

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const params = { page, limit: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}) };
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => catalogService.getUsers(params),
  });

  const cinemasQuery = useQuery({
    queryKey: ["cinemas"],
    queryFn: () => catalogService.getCinemas(),
  });

  const accessMutation = useMutation({
    mutationFn: ({ id, data }) => catalogService.updateUserAccess(id, data),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) =>
      setActionError(error.response?.data?.message || "Không thể cập nhật quyền tài khoản."),
  });

  const assignCinemaMutation = useMutation({
    mutationFn: ({ id, cinemaId }) =>
      catalogService.assignCinema(id, {
        cinemaId,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      });

      setActionError("");
    },

    onError: (error) =>
      setActionError(
        error.response?.data?.message ||
        "Không thể gán rạp cho manager."
      ),
  });

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
    setActionError("");
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 bg-gray-950 p-4 text-gray-100 md:p-8">
      <header className="border-b border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Quản lý người dùng</h1>
            <p className="mt-1 text-sm text-gray-400">
              Quản lý tài khoản, phân quyền và khóa/mở khóa người dùng.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Tổng người dùng" value={usersQuery.data?.pagination.total ?? "—"} />
        <Stat label="Trang hiện tại" value={usersQuery.data?.pagination.page ?? page} />
      </div>
      {actionError && (
        <p role="alert" className="rounded border border-red-500 p-3 text-red-400">
          {actionError}
        </p>
      )}

      <label className="relative block max-w-md">
        <span className="sr-only">Tìm người dùng</span>
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Tìm theo tên hoặc email..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3 pl-11 pr-4"
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
        {usersQuery.isPending ? (
          <p role="status" className="p-10 text-center">
            Đang tải người dùng...
          </p>
        ) : usersQuery.isError ? (
          <p role="alert" className="p-10 text-center text-red-400">
            Không thể tải danh sách người dùng.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <caption className="sr-only">Danh sách người dùng</caption>
              <thead className="bg-gray-900 text-xs uppercase text-gray-400">
                <tr>
                  <th className="p-4">Họ tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Điện thoại</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Rạp quản lý</th>
                  <th className="p-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {usersQuery.data.data.map((user) => (
                  <tr key={user.id}>
                    <td className="p-4 font-medium">{user.name}</td>

                    <td className="p-4">{user.email}</td>

                    <td className="p-4 text-gray-400">
                      {user.phone || "Chưa cập nhật"}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Vai trò ${user.email}`}
                          value={user.role}
                          disabled={
                            accessMutation.isPending &&
                            accessMutation.variables?.id === user.id
                          }
                          onChange={(event) =>
                            accessMutation.mutate({
                              id: user.id,
                              data: { role: event.target.value },
                            })
                          }
                          className="rounded border border-gray-700 bg-gray-900 p-1"
                        >
                          <option value="customer">customer</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>

                        <button
                          type="button"
                          disabled={
                            accessMutation.isPending &&
                            accessMutation.variables?.id === user.id
                          }
                          onClick={() =>
                            accessMutation.mutate({
                              id: user.id,
                              data: { is_active: !user.is_active },
                            })
                          }
                          className="rounded border border-gray-700 px-2 py-1"
                        >
                          {user.is_active ? "Khóa" : "Mở khóa"}
                        </button>

                        <span className={user.is_active ? "text-green-400" : "text-red-400"}>
                          {user.is_active ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </div>
                    </td>

                    {/* Rạp quản lý */}
                    <td className="p-4">
                      {user.role === "manager" ? (
                        <select
                          value={user.theater_id || ""}
                          disabled={
                            assignCinemaMutation.isPending &&
                            assignCinemaMutation.variables?.id === user.id
                          }
                          onChange={(event) =>
                            assignCinemaMutation.mutate({
                              id: user.id,
                              cinemaId: event.target.value,
                            })
                          }
                          className="rounded border border-gray-700 bg-gray-900 p-2"
                        >
                          <option value="">
                            {cinemasQuery.isPending
                              ? "Đang tải rạp..."
                              : "-- Chọn rạp --"}
                          </option>

                          {cinemasQuery.isError ? (
                            <option value="">Không tải được danh sách rạp</option>
                          ) : (
                            cinemasQuery.data?.map((cinema) => (
                              <option key={cinema.id} value={cinema.id}>
                                {cinema.name}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <span className="text-gray-500">Không áp dụng</span>
                      )}
                    </td>

                    {/* Ngày tạo */}
                    <td className="p-4 text-gray-400">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {usersQuery.data.data.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-400">
                      Không tìm thấy người dùng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {usersQuery.data?.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span>
            Trang {page} / {usersQuery.data.pagination.pages}
          </span>
          <button
            type="button"
            disabled={page >= usersQuery.data.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
    <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
    <p className="mt-2 text-3xl font-bold">{value}</p>
  </div>
);

export default AdminUsers;
