import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter, X, SlidersHorizontal, RefreshCw } from "lucide-react";
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

  // Check if filters are active for UI state
  const isFilterActive = filters.genre !== "" || filters.minRating !== "";

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      <div className="container-custom py-8 md:py-12">

        {/* 1. HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#2b2d42]">
              {filters.status === "now_showing" ? "Phim đang chiếu" : "Phim sắp ra mắt"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {filters.status === "now_showing"
                ? "Những tựa phim hấp dẫn nhất tại rạp"
                : "Đừng bỏ lỡ những bộ phim sắp ra mắt"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Status Toggles (Đang chiếu / Sắp chiếu) */}
            <div className="flex gap-1 p-1 bg-[#F3F4F6] rounded-xl w-full sm:w-auto">
              <button
                onClick={() => handleFilterChange("status", "now_showing")}
                className={`flex-1 px-5 py-2 rounded-lg font-medium text-sm transition-all ${filters.status === "now_showing"
                    ? "bg-white text-[#DC2626] shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-[#2b2d42]"
                  }`}
              >
                Đang chiếu
              </button>
              <button
                onClick={() => handleFilterChange("status", "coming_soon")}
                className={`flex-1 px-5 py-2 rounded-lg font-medium text-sm transition-all ${filters.status === "coming_soon"
                    ? "bg-white text-[#DC2626] shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-[#2b2d42]"
                  }`}
              >
                Sắp chiếu
              </button>
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowFilters(true)}
              className="md:hidden flex items-center justify-center gap-2 bg-[#DC2626] text-white font-bold px-5 py-2 rounded-xl hover:bg-[#B91C1C] transition shadow-md shadow-[#DC2626]/30"
            >
              <Filter className="w-4 h-4" />
              Lọc
            </button>
          </div>
        </div>

        {/* 2. MAIN CONTENT GRID */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* FILTERS SIDEBAR - DESKTOP */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#2b2d42]" />
                  <h3 className="font-bold text-[#2b2d42]">Bộ lọc</h3>
                </div>
                <button
                  onClick={clearFilters}
                  className={`text-xs font-semibold underline-offset-2 transition-colors ${isFilterActive
                      ? "text-[#DC2626] hover:text-[#B91C1C] underline"
                      : "text-gray-300 cursor-not-allowed"
                    }`}
                  disabled={!isFilterActive}
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="space-y-6">
                {genresQuery.isError && (
                  <p role="alert" className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                    Không tải được thể loại.
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    Thể loại
                  </label>
                  <select
                    aria-label="Thể loại"
                    value={filters.genre}
                    onChange={(e) => handleFilterChange("genre", e.target.value)}
                    className="w-full p-2.5 bg-[#F3F4F6] border border-transparent focus:border-[#DC2626] rounded-xl outline-none text-sm text-[#2b2d42] transition"
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
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    Đánh giá (Sao)
                  </label>
                  <select
                    aria-label="Đánh giá"
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange("minRating", e.target.value)}
                    className="w-full p-2.5 bg-[#F3F4F6] border border-transparent focus:border-[#DC2626] rounded-xl outline-none text-sm text-[#2b2d42] transition"
                  >
                    <option value="">Tất cả</option>
                    <option value="5">5 Sao</option>
                    <option value="4">4+ Sao</option>
                    <option value="3">3+ Sao</option>
                    <option value="2">2+ Sao</option>
                    <option value="1">1+ Sao</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    Sắp xếp
                  </label>
                  <select
                    aria-label="Sắp xếp theo"
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    className="w-full p-2.5 bg-[#F3F4F6] border border-transparent focus:border-[#DC2626] rounded-xl outline-none text-sm text-[#2b2d42] transition"
                  >
                    <option value="release_date">Mới nhất</option>
                    <option value="popular">Phổ biến nhất</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE FILTERS MODAL */}
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
                className="w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-[#2b2d42]">Bộ lọc</h3>
                  <button
                    type="button"
                    aria-label="Đóng bộ lọc"
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#2b2d42]">Thể loại</label>
                    <select
                      aria-label="Thể loại mobile"
                      value={filters.genre}
                      onChange={(e) => handleFilterChange("genre", e.target.value)}
                      className="w-full p-3 bg-[#F3F4F6] rounded-xl border-none outline-none text-sm"
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
                    <label className="block text-sm font-medium mb-2 text-[#2b2d42]">Đánh giá</label>
                    <select
                      aria-label="Đánh giá mobile"
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange("minRating", e.target.value)}
                      className="w-full p-3 bg-[#F3F4F6] rounded-xl border-none outline-none text-sm"
                    >
                      <option value="">Tất cả</option>
                      <option value="5">5 Sao</option>
                      <option value="4">4+ Sao</option>
                      <option value="3">3+ Sao</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="w-full mt-6 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-3 rounded-xl shadow-md shadow-[#DC2626]/30"
                  >
                    Áp dụng bộ lọc
                  </Button>
                </div>
              </motion.div>
            </AccessibleDialog>
          )}

          {/* MOVIE GRID */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-[#F3F4F6] rounded-2xl aspect-[3/4]"
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
                  <div className="flex justify-center items-center gap-3 mt-12">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#2b2d42] hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      Trước
                    </button>
                    <span className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-[#F3F4F6] rounded-xl">
                      {page} / {data.pagination.pages}
                    </span>
                    <button
                      disabled={page === data.pagination.pages}
                      onClick={() => setPage(page + 1)}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#2b2d42] hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Loading Overlay on Pagination/Refetch */}
            {isFetching && !isLoading && (
              <div className="text-center py-8 mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                  <RefreshCw className="w-4 h-4 text-[#DC2626] animate-spin" />
                  <span className="text-sm text-gray-500 font-medium">Đang tải thêm phim...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;