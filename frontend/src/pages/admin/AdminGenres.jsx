import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Tag, List } from "lucide-react";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

export default function AdminGenres() {
  const client = useQueryClient();
  const [form, setForm] = useState({ id: null, name: "", description: "" });
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: queryKeys.genres.list, queryFn: catalogService.getGenres });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.genres.all });
  const save = useMutation({
    mutationFn: (value) =>
      value.id
        ? catalogService.updateGenre(value.id, { name: value.name, description: value.description })
        : catalogService.createGenre({ name: value.name, description: value.description }),
    onSuccess: () => {
      setForm({ id: null, name: "", description: "" });
      setError("");
      refresh();
    },
    onError: (requestError) =>
      setError(requestError.response?.data?.message || "Không thể lưu thể loại."),
  });
  const remove = useMutation({
    mutationFn: catalogService.deleteGenre,
    onSuccess: refresh,
    onError: (requestError) =>
      setError(requestError.response?.data?.message || "Không thể xóa thể loại."),
  });

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <List className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý thể loại</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Quản lý các thể loại phim để phân loại nội dung.
              </p>
            </div>
          </div>
        </div>

        <FormAlert message={error} />

        {/* Create/Edit Form - Glassmorphism */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(form);
          }}
          className="mb-8 flex flex-col md:flex-row gap-4 rounded-2xl bg-slate-900/80 border border-white/5 p-5 backdrop-blur-sm shadow-xl"
        >
          <div className="flex-1 relative group">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors" />
            <input
              required
              maxLength="100"
              placeholder="Nhập tên thể loại..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/50 focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
            />
          </div>

          <div className="flex-[2] relative group">
            <Edit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#A78BFA] transition-colors" />
            <input
              maxLength="500"
              placeholder="Mô tả ngắn gọn..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#A78BFA]/50 focus:ring-2 focus:ring-[#A78BFA]/20 transition-all"
            />
          </div>

          <button
            disabled={save.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {form.id ? "Cập nhật" : "Thêm thể loại"}
          </button>
        </form>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            {query.isPending ? (
              <div className="p-10 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
                  <p className="text-slate-400 font-medium">Đang tải danh sách thể loại...</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center w-1/3">Tên thể loại</th>
                    <th className="px-6 py-4 font-semibold text-center w-1/3">Mô tả</th>
                    <th className="px-6 py-4 font-semibold text-center w-1/3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(query.data || []).map((genre) => (
                    <tr key={genre.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                          {genre.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400">
                        {genre.description || (
                          <span className="text-slate-600 italic">Chưa có mô tả</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setForm(genre)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" /> Sửa
                          </button>
                          <button
                            onClick={() => window.confirm("Bạn có chắc chắn muốn xóa thể loại này?") && remove.mutate(genre.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(query.data || []).length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-10 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Tag className="w-8 h-8 text-slate-600 opacity-50" />
                          <p>Chưa có thể loại nào. Hãy thêm thể loại mới ở trên.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}