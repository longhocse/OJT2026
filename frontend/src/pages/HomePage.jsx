import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import MovieCard from "../components/common/MovieCard";
import { movieService } from "../services/movieService";
import { queryKeys } from "../services/queryKeys";
import SafeImage from "../components/common/SafeImage";
import RecommendationWidget from "../components/ai/RecommendationWidget";
import ApiErrorState from "../components/common/ApiErrorState";

const HomePage = () => {
  const nowParams = { status: "now_showing", page: 1, limit: 6, sortBy: "release_date" };
  const comingParams = { status: "coming_soon", page: 1, limit: 3, sortBy: "release_date" };
  const nowShowing = useQuery({
    queryKey: queryKeys.movies.list(nowParams),
    queryFn: () => movieService.getMovies(nowParams),
  });
  const comingSoon = useQuery({
    queryKey: queryKeys.movies.list(comingParams),
    queryFn: () => movieService.getMovies(comingParams),
  });

  const featured = nowShowing.data?.data[0] || null;

  return (
    <main className="bg-background text-on-background">
      <section className="relative flex min-h-[65vh] items-end overflow-hidden">
        {featured?.poster_url ? (
          <SafeImage
            src={featured.poster_url}
            alt=""
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-8 md:pb-24">
          <p className="mb-3 text-sm uppercase tracking-widest text-secondary">MovieTap</p>
          <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
            {featured?.title || "Khám phá phim đang chiếu"}
          </h1>
          {featured && (
            <p className="mt-4 max-w-2xl text-on-surface-variant">
              {[featured.genre, `${featured.duration} phút`].filter(Boolean).join(" • ")}
            </p>
          )}
          <div className="mt-8 flex gap-4">
            <Link
              to={featured ? `/movie/${featured.id}` : "/movies"}
              className="rounded-lg bg-primary-container px-7 py-3 font-semibold text-on-primary-container"
            >
              {featured ? "Xem suất chiếu" : "Xem danh sách phim"}
            </Link>
            <Link
              to="/movies"
              className="rounded-lg border border-white/20 px-7 py-3 font-semibold"
            >
              Tất cả phim
            </Link>
          </div>
        </div>
      </section>

      <MovieSection
        title="Phim đang chiếu"
        query={nowShowing}
        emptyText="Hiện chưa có phim đang chiếu."
      />
      <MovieSection
        title="Phim sắp chiếu"
        query={comingSoon}
        emptyText="Hiện chưa có phim sắp chiếu."
      />
      <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
        <h2 className="mb-8 text-2xl font-bold">Đề xuất dành cho bạn</h2>
        <RecommendationWidget />
      </section>
    </main>
  );
};

const MovieSection = ({ title, query, emptyText }) => {
  const movies = query.data?.data || [];
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link to="/movies" className="text-sm text-primary">
          Xem tất cả
        </Link>
      </div>
      {query.isPending ? (
        <div role="status" className="py-12 text-center">
          Đang tải phim...
        </div>
      ) : query.isError ? (
        <ApiErrorState
          message="Không thể tải danh sách phim."
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : movies.length === 0 ? (
        <p className="py-10 text-center text-on-surface-variant">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomePage;
