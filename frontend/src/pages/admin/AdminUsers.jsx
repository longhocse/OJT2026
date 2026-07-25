import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, Shield, Lock, Unlock, Calendar, Mail, Phone, User as UserIcon } from "lucide-react";
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

const getActiveTheaterIds = (user) =>
  (user.theaterAssignments || [])
    .filter((assignment) => assignment.is_active && assignment.theater?.id)
    .map((assignment) => String(assignment.theater.id));

const getPrimaryTheaterId = (user) => getActiveTheaterIds(user)[0] || "";

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
    queryKey: queryKeys.cinemas.adminList({ page: 1, limit: 100 }),
    queryFn: async () => {
      try {
        const result = await catalogService.getAdminCinemas({ page: 1, limit: 100 });
        if (result.data.length > 0) return result;
      } catch (_error) {
        // Public list is a safe fallback when the scoped endpoint has no result.
      }
      const data = await catalogService.getCinemas();
      return { data };
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

  const updateRole = (user, role) => {
    const theaterIds = getActiveTheaterIds(user);
    accessMutation.mutate({
      id: user.id,
      data: {
        role,
        theaterIds: isOperationRole(role) && role !== ADMIN_ROLE ? theaterIds : [],
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
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header & Title */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý người dùng</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Quản lý tài khoản, phân quyền và cơ sở làm việc của nhân viên.
              </p>
            </div>
          </div>
        </div>

        {/* Stats & Search Bar (Glassmorphism) */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 rounded-2xl bg-slate-900/80 border border-white/5 p-4 backdrop-blur-sm shadow-xl items-end">
          <div className="flex flex-1 gap-4 w-full sm:w-auto">
            <div className="flex-1 rounded-xl bg-slate-800/50 border border-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng người dùng</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                {usersQuery.data?.pagination.total ?? <span className="text-slate-600">—</span>}
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-slate-800/50 border border-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cơ sở</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{cinemas.length}</p>
            </div>
            <div className="flex-1 rounded-xl bg-slate-800/50 border border-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Trang hiện tại</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                {usersQuery.data?.pagination.page ?? page}
              </p>
            </div>
          </div>

          <div className="flex-1 relative group w-full sm:w-auto min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {actionError && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm font-medium">
            {actionError}
          </div>
        )}

        {!cinemasQuery.isPending && cinemas.length === 0 && (
          <div role="alert" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            Chưa tải được cơ sở nào. Hãy kiểm tra danh sách Cinemas và kết nối backend.
          </div>
        )}

        {/* Main Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            {usersQuery.isPending ? (
              <div className="p-12 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  <p className="text-slate-400 font-medium">Đang tải danh sách người dùng...</p>
                </div>
              </div>
            ) : usersQuery.isError ? (
              <div className="p-12 text-center text-red-400 font-medium bg-red-500/10 border-t border-red-500/20">
                Không thể tải danh sách người dùng. Vui lòng thử lại.
              </div>
            ) : (
              <table className="min-w-[1120px] w-full text-left text-sm text-slate-300">
                <caption className="sr-only">Danh sách người dùng</caption>
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Họ tên</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Điện thoại</th>
                    <th className="px-6 py-4 font-semibold text-center">Vai trò</th>
                    <th className="px-6 py-4 font-semibold text-center">Cơ sở làm việc</th>
                    <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold text-center">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersQuery.data.data.map((user) => {
                    const selectedTheaterId = getPrimaryTheaterId(user);
                    const needsTheater = isOperationRole(user.role) && user.role !== ADMIN_ROLE;
                    return (
                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-slate-800/50 text-blue-400 border border-white/5">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{user.email}</span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-400">{user.phone || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="relative inline-block">
                            <select
                              aria-label={`Vai trò ${user.email}`}
                              value={user.role}
                              disabled={accessMutation.isPending}
                              onChange={(event) => updateRole(user, event.target.value)}
                              className="appearance-none rounded-xl bg-slate-800/50 border border-blue-500/20 px-3 py-2 pr-8 text-xs font-semibold text-blue-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                            >
                              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <Shield className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400/70 pointer-events-none" />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <select
                          aria-label={`Cơ sở ${user.email}`}
                          value={selectedTheaterId}
                          disabled={accessMutation.isPending || !needsTheater || cinemasQuery.isPending}
                          onChange={(event) => updateTheater(user, event.target.value)}
                          className="w-52 rounded-xl border border-slate-700/70 bg-slate-800/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <option value="">{needsTheater ? "Chọn cơ sở" : "Không áp dụng"}</option>
                          {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
                        </select>
                        {needsTheater && !selectedTheaterId && <p className="mt-1 text-[11px] text-amber-400">Chưa được gán cơ sở</p>}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            disabled={accessMutation.isPending}
                            onClick={() =>
                              accessMutation.mutate({
                                id: user.id,
                                data: { is_active: !user.is_active },
                              })
                            }
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all disabled:opacity-50 ${user.is_active
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                              }`}
                          >
                            {user.is_active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {user.is_active ? "Hoạt động" : "Đã khóa"}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-3 py-1.5 border border-white/5 text-slate-400 text-xs">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("vi-VN")
                            : "—"}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {usersQuery.data.data.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-8 h-8 text-slate-600 opacity-50" />
                          <p>Không tìm thấy người dùng phù hợp.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination - Modern Chip Style */}
        {usersQuery.data?.pagination.pages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-400">
            <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
              Trang {page} / {usersQuery.data.pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-blue-500/30 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Trước
              </button>
              <span className="px-3 py-1 font-mono text-slate-500">
                {page} / {usersQuery.data.pagination.pages}
              </span>
              <button
                type="button"
                disabled={page >= usersQuery.data.pagination.pages}
                onClick={() => setPage((value) => value + 1)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-blue-500/30 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminUsers;
