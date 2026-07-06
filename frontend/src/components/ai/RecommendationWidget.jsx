import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { normalizeApiError } from "../../services/apiError";
import { queryKeys } from "../../services/queryKeys";
import { recommendationService } from "../../services/recommendationService";
import MovieCard from "../common/MovieCard";

const RecommendationWidget = () => {
  const { token, user, isAuthenticated, verificationStatus } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const isVerifying = Boolean(token) && ["idle", "verifying"].includes(verificationStatus);
  const isPersonal = isAuthenticated && verificationStatus === "authenticated" && Boolean(user);

  const recommendationQuery = useQuery({
    queryKey: isPersonal ? queryKeys.recommendations.personal : queryKeys.recommendations.trending,
    queryFn: isPersonal ? recommendationService.getPersonal : recommendationService.getTrending,
    enabled: !isVerifying,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !error?.response && failureCount < 2,
  });

  if (isVerifying || recommendationQuery.isPending) return <RecommendationSkeleton />;

  if (recommendationQuery.isError) {
    const networkError = normalizeApiError(recommendationQuery.error).status === null;
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center"
      >
        <p>
          {networkError ? "Không thể kết nối để tải đề xuất." : "Không thể tải đề xuất lúc này."}
        </p>
        <button
          type="button"
          onClick={() => recommendationQuery.refetch()}
          disabled={recommendationQuery.isFetching}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          {recommendationQuery.isFetching ? "Đang thử lại..." : "Thử lại"}
        </button>
      </div>
    );
  }

  const recommendations = recommendationQuery.data || [];
  return (
    <div>
      {!isPersonal && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/10 p-4">
          <p>Đang hiển thị phim thịnh hành. Đăng nhập để nhận đề xuất cá nhân.</p>
          <Link to="/login" className="font-semibold text-primary">
            Đăng nhập
          </Link>
        </div>
      )}
      {recommendations.length === 0 ? (
        <div className="py-10 text-center text-on-surface-variant">
          {isPersonal
            ? "Chưa có đề xuất phù hợp với lịch sử booking đã xác nhận của bạn."
            : "Chưa có phim thịnh hành."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {recommendations.slice(0, 4).map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate("/movies")}
            className="inline-flex items-center gap-1 font-medium text-primary"
          >
            Xem tất cả đề xuất <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const RecommendationSkeleton = () => (
  <div
    role="status"
    aria-label="Đang tải đề xuất"
    className="grid grid-cols-2 gap-6 md:grid-cols-4"
  >
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="h-80 animate-pulse rounded-xl bg-gray-700" />
    ))}
  </div>
);

export default RecommendationWidget;
