import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter, X } from "lucide-react";
import MovieCard from "../components/common/MovieCard";
import Button from "../components/common/Button";
import { movieService } from "../services/movieService";
import { queryKeys } from "../services/queryKeys";
import { movieFilterSchema } from "../validation/schemas";
import { catalogService } from "../services/catalogService";
import AccessibleDialog from "../components/common/AccessibleDialog";
import ApiErrorState from "../components/common/ApiErrorState";

const MoviesPage = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    genre: "",
    minRating: "",
    sortBy: "release_date",
    status: ["coming_soon", "now_showing", "ended"].includes(searchParams.get("status"))
      ? searchParams.get("status")
      : "now_showing",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () =>
      movieFilterSchema.parse({
        ...(filters.genre ? { genre: filters.genre } : {}),
        ...(filters.minRating ? { minRating: Number(filters.minRating) } : {}),
        sortBy: filters.sortBy,
        status: filters.status,
        page,
        limit: 12,
      }),
    [filters, page],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.movies.list(queryParams),
    queryFn: () => movieService.getMovies(queryParams),
  });

  const genresQuery = useQuery({
    queryKey: queryKeys.genres.list,
    queryFn: catalogService.getGenres,
    staleTime: 30 * 60 * 1000,
  });
  const genres = genresQuery.data || [];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      genre: "",
      minRating: "",
      sortBy: "release_date",
      status: "now_showing",
    });
    setPage(1);
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="font-heading text-3xl font-bold">
          {filters.status === "now_showing" ? "Phim đang chiếu" : "Phim sắp ra mắt"}
        </h1>
        <div className="flex gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange("status", "now_showing")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filters.status === "now_showing"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Đang chiếu
            </button>
            <button
              onClick={() => handleFilterChange("status", "coming_soon")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filters.status === "coming_soon"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Sắp chiếu
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="movie-filter-dialog"
            className="md:hidden"
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar - Desktop */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Bộ lọc</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-primary-600"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="space-y-5">
              {genresQuery.isError && (
                <p role="alert" className="text-sm text-red-500">
                  Không thể tải thể loại; bạn vẫn có thể lọc theo trạng thái và rating.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Thể loại</label>
                <select
                  aria-label="Thể loại"
                  value={filters.genre}
                  onChange={(e) => handleFilterChange("genre", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Tất cả</option>
                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.name}>
                      {genre.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Đánh giá ≥</label>
                <select
                  aria-label="Đánh giá"
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange("minRating", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Tất cả</option>
                  <option value="5">5+</option>
                  <option value="4">4+</option>
                  <option value="3">3+</option>
                  <option value="2">2+</option>
                  <option value="1">1+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sắp xếp theo</label>
                <select
                  aria-label="Sắp xếp theo"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="release_date">Mới nhất</option>
                  <option value="popular">Phổ biến nhất</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showFilters && (
          <AccessibleDialog
            title="Bộ lọc phim"
            onClose={() => setShowFilters(false)}
            id="movie-filter-dialog"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white dark:bg-gray-800 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  aria-label="Đóng bộ lọc"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Thể loại</label>
                  <select
                    aria-label="Thể loại mobile"
                    value={filters.genre}
                    onChange={(e) => handleFilterChange("genre", e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Tất cả</option>
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.name}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đánh giá ≥</label>
                  <select
                    aria-label="Đánh giá mobile"
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange("minRating", e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Tất cả</option>
                    <option value="5">5</option>
                    <option value="4">4+</option>
                    <option value="3">3+</option>
                  </select>
                </div>
                <Button onClick={() => setShowFilters(false)} className="w-full mt-4">
                  Áp dụng
                </Button>
              </div>
            </motion.div>
          </AccessibleDialog>
        )}

        {/* Movie Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-80"
                ></div>
              ))}
            </div>
          ) : isError ? (
            <ApiErrorState
              message="Không thể tải danh sách phim."
              onRetry={refetch}
              retrying={isFetching}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {data?.data?.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>

              {/* Pagination */}
              {data?.pagination && data.pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    Trang {page} / {data.pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === data.pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
          {isFetching && !isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;
