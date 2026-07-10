import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, Plus, Trash2, Film, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { movieService } from "../../services/movieService";
import { queryKeys } from "../../services/queryKeys";
import SafeImage from "../../components/common/SafeImage";

const params = { page: 1, limit: 100, sortBy: "release_date" };

const AdminMovies = () => {
  const queryClient = useQueryClient();
  const moviesQuery = useQuery({
    queryKey: queryKeys.movies.list(params),
    queryFn: () => movieService.getMovies(params),
  });
  const deleteMutation = useMutation({
    mutationFn: movieService.deleteMovie,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.movies.all }),
  });

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý phim</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Quản lý toàn bộ danh sách phim, trạng thái và thông tin chi tiết.
              </p>
            </div>
          </div>

          <Link
            to="/admin/movies/create"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-5 py-2.5 text-white font-semibold shadow-lg shadow-cyan-900/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Thêm phim mới
          </Link>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-[780px] w-full text-left text-sm text-slate-300">
              <caption className="sr-only">Danh sách phim quản trị</caption>
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">Phim</th>
                  <th className="px-6 py-4 font-semibold">Thể loại</th>
                  <th className="px-6 py-4 font-semibold text-center">Rating</th>
                  <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moviesQuery.isPending ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
                        <p className="text-slate-500 font-medium">Đang tải danh sách phim...</p>
                      </div>
                    </td>
                  </tr>
                ) : moviesQuery.isError ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="inline-block rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-red-400 font-medium">
                        Không thể tải danh sách phim. Vui lòng thử lại.
                      </div>
                    </td>
                  </tr>
                ) : (
                  moviesQuery.data.data.map((movie) => (
                    <tr key={movie.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0 rounded-xl overflow-hidden border border-white/5">
                            <SafeImage
                              src={movie.poster_url}
                              alt={movie.title}
                              className="h-16 w-12 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                              {movie.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              {movie.duration || "—"} phút
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium border border-white/5">
                          {movie.genre || "Chưa cập nhật"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/10 px-3 py-1 border border-yellow-500/20 text-yellow-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          {movie.rating ? Number(movie.rating).toFixed(1) : "0.0"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${movie.status === "now_showing"
                            ? "bg-green-500/10 text-emerald-400 border-green-500/20"
                            : movie.status === "coming_soon"
                              ? "bg-blue-500/10 text-cyan-400 border-blue-500/20"
                              : "bg-gray-500/10 text-slate-400 border-gray-500/20"
                          }`}>
                          {movie.status === "now_showing" ? "Đang chiếu"
                            : movie.status === "coming_soon" ? "Sắp chiếu"
                              : "Đã kết thúc"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/movie/${movie.id}`}
                            aria-label={`Xem ${movie.title}`}
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/movies/edit/${movie.id}`}
                            aria-label={`Sửa ${movie.title}`}
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label={`Xóa ${movie.title}`}
                            disabled={deleteMutation.isPending}
                            onClick={() =>
                              window.confirm("Bạn có chắc muốn xóa phim này?") &&
                              deleteMutation.mutate(movie.id)
                            }
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminMovies;