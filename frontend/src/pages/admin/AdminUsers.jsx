import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, Shield, Lock, Unlock, Calendar, Mail, Phone, User as UserIcon } from "lucide-react";
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
                Quản lý tài khoản, phân quyền và trạng thái người dùng.
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
              <table className="min-w-[860px] w-full text-left text-sm text-slate-300">
                <caption className="sr-only">Danh sách người dùng</caption>
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Họ tên</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Điện thoại</th>
                    <th className="px-6 py-4 font-semibold text-center">Vai trò & Trạng thái</th>
                    <th className="px-6 py-4 font-semibold text-center">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersQuery.data.data.map((user) => (
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
                        <div className="flex flex-wrap items-center justify-center gap-2">

                          {/* Role Selector - Pill Style */}
                          <div className="relative inline-block">
                            <select
                              aria-label={`Vai trò ${user.email}`}
                              value={user.role}
                              disabled={accessMutation.isPending}
                              onChange={(event) =>
                                accessMutation.mutate({
                                  id: user.id,
                                  data: { role: event.target.value },
                                })
                              }
                              className="appearance-none rounded-full bg-slate-800/50 border border-blue-500/20 px-3 py-1 pr-7 text-xs font-semibold text-blue-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                            >
                              <option value="customer">customer</option>
                              <option value="admin">admin</option>
                            </select>
                            <Shield className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400/70 pointer-events-none" />
                          </div>

                          {/* Toggle Active Button */}
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
                  ))}
                  {usersQuery.data.data.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
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