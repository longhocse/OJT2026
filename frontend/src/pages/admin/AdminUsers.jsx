import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";
import {
  ADMIN_ROLE,
  CASHIER_ROLE,
  CUSTOMER_ROLE,
  MANAGER_ROLE,
  TICKET_CHECKER_ROLE,
  isOperationRole,
} from "../../utils/roles";

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: CUSTOMER_ROLE, label: "Khách hàng" },
  { value: ADMIN_ROLE, label: "Quản trị hệ thống" },
  { value: MANAGER_ROLE, label: "Quản lý chi nhánh" },
  { value: CASHIER_ROLE, label: "Thu ngân" },
  { value: TICKET_CHECKER_ROLE, label: "Soát vé" },
];

const roleLabel = (role) => ROLE_OPTIONS.find((option) => option.value === role)?.label || role;

const getPrimaryTheaterId = (user) =>
  user.theaterAssignments?.find((assignment) => assignment.is_active)?.theater?.id || "";

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
    queryKey: queryKeys.cinemas.adminList({ page: 1, limit: 200 }),
    queryFn: async () => {
      try {
        const adminResult = await catalogService.getAdminCinemas({ page: 1, limit: 200 });
        if (adminResult.data.length > 0) return adminResult;
      } catch (_error) {
        // Fallback below keeps the branch selector usable if the scoped admin list is unavailable.
      }

      const publicCinemas = await catalogService.getCinemas();
      return {
        data: publicCinemas,
        pagination: {
          page: 1,
          limit: publicCinemas.length || 200,
          total: publicCinemas.length,
          pages: 1,
        },
      };
    },
  });

  const cinemas = useMemo(() => cinemasQuery.data?.data || [], [cinemasQuery.data]);

  const accessMutation = useMutation({
    mutationFn: ({ id, data }) => catalogService.updateUserAccess(id, data),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) =>
      setActionError(error.response?.data?.message || "Không thể cập nhật quyền tài khoản."),
  });

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const updateRole = (user, nextRole) => {
    const currentTheaterId = getPrimaryTheaterId(user);
    accessMutation.mutate({
      id: user.id,
      data: {
        role: nextRole,
        theaterIds: isOperationRole(nextRole) && nextRole !== ADMIN_ROLE && currentTheaterId ? [currentTheaterId] : [],
      },
    });
  };

  const updateTheater = (user, theaterId) => {
    accessMutation.mutate({
      id: user.id,
      data: { theaterIds: theaterId ? [theaterId] : [] },
    });
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
              Gán vai trò và chi nhánh làm việc cho quản lý, thu ngân và nhân viên soát vé.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tổng người dùng" value={usersQuery.data?.pagination.total ?? "—"} />
        <Stat label="Trang hiện tại" value={usersQuery.data?.pagination.page ?? page} />
        <Stat label="Chi nhánh khả dụng" value={cinemas.length} />
      </div>

      {actionError && (
        <p role="alert" className="rounded border border-red-500 p-3 text-red-400">
          {actionError}
        </p>
      )}

      {!cinemasQuery.isPending && cinemas.length === 0 && (
        <p role="alert" className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Chưa tải được chi nhánh nào. Hãy kiểm tra mục Cinemas đã có rạp hoạt động, hoặc backend đang chạy đúng database.
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
            <table className="min-w-[980px] w-full text-left text-sm">
              <caption className="sr-only">Danh sách người dùng</caption>
              <thead className="bg-gray-900 text-xs uppercase text-gray-400">
                <tr>
                  <th className="p-4">Họ tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Điện thoại</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Chi nhánh</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {usersQuery.data.data.map((user) => {
                  const selectedTheaterId = getPrimaryTheaterId(user);
                  const needsTheater = isOperationRole(user.role) && user.role !== ADMIN_ROLE;

                  return (
                    <tr key={user.id}>
                      <td className="p-4 font-medium">{user.name}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4 text-gray-400">{user.phone || "Chưa cập nhật"}</td>
                      <td className="p-4">
                        <select
                          aria-label={`Vai trò ${user.email}`}
                          value={user.role}
                          disabled={accessMutation.isPending}
                          onChange={(event) => updateRole(user, event.target.value)}
                          className="w-48 rounded border border-gray-700 bg-gray-900 p-2"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">{roleLabel(user.role)}</p>
                      </td>
                      <td className="p-4">
                        <select
                          aria-label={`Chi nhánh ${user.email}`}
                          value={selectedTheaterId}
                          disabled={accessMutation.isPending || !needsTheater || cinemasQuery.isPending}
                          onChange={(event) => updateTheater(user, event.target.value)}
                          className="w-56 rounded border border-gray-700 bg-gray-900 p-2 disabled:opacity-50"
                        >
                          <option value="">{needsTheater ? "Chọn chi nhánh" : "Không áp dụng"}</option>
                          {cinemas.map((cinema) => (
                            <option key={cinema.id} value={cinema.id}>
                              {cinema.name}
                            </option>
                          ))}
                        </select>
                        {needsTheater && !selectedTheaterId && (
                          <p className="mt-1 text-xs text-amber-400">Cần gán chi nhánh để tài khoản làm việc đúng phạm vi.</p>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          disabled={accessMutation.isPending}
                          onClick={() =>
                            accessMutation.mutate({
                              id: user.id,
                              data: { is_active: !user.is_active },
                            })
                          }
                          className="rounded border border-gray-700 px-3 py-2"
                        >
                          {user.is_active ? "Khóa" : "Mở khóa"}
                        </button>
                        <p className={user.is_active ? "mt-1 text-green-400" : "mt-1 text-red-400"}>
                          {user.is_active ? "Hoạt động" : "Đã khóa"}
                        </p>
                      </td>
                      <td className="p-4 text-gray-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                      </td>
                    </tr>
                  );
                })}
                {usersQuery.data.data.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-400">
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
