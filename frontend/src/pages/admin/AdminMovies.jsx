import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";
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
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý phim</h1>
        <Link
          to="/admin/movies/create"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Thêm phim
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
        <table className="min-w-[720px] w-full text-left">
          <caption className="sr-only">Danh sách phim quản trị</caption>
          <thead>
            <tr>
              <th className="p-4">Phim</th>
              <th className="p-4">Thể loại</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {moviesQuery.isPending ? (
              <tr>
                <td colSpan="5" className="p-8 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : moviesQuery.isError ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-red-500">
                  Không thể tải phim.
                </td>
              </tr>
            ) : (
              moviesQuery.data.data.map((movie) => (
                <tr key={movie.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <SafeImage
                        src={movie.poster_url}
                        alt={movie.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                      <span>{movie.title}</span>
                    </div>
                  </td>
                  <td className="p-4">{movie.genre || "—"}</td>
                  <td className="p-4">{movie.rating.toFixed(1)}</td>
                  <td className="p-4">{movie.status}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link to={`/movie/${movie.id}`} aria-label={`Xem ${movie.title}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link to={`/admin/movies/edit/${movie.id}`} aria-label={`Sửa ${movie.title}`}>
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
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default AdminMovies;
