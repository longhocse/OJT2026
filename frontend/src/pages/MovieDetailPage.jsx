import React, { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Star, Clock, Calendar, Tag, User, Ticket } from "lucide-react";
import { movieService } from "../services/movieService";
import { bookingService } from "../services/bookingService";
import Button from "../components/common/Button";
import { queryKeys } from "../services/queryKeys";
import FormAlert from "../components/common/FormAlert";
import { applyBackendErrors } from "../validation/formErrors";
import { reviewSchema } from "../validation/schemas";
import SafeImage from "../components/common/SafeImage";
import { getSafeResourceUrl, getSafeYouTubeEmbedUrl } from "../utils/security";
import { getReviewSubmissionState } from "../booking/reviewContract";

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewState, setReviewState] = useState("idle");
  const reviewSubmittingRef = useRef(false);
  const {
    register: registerReview,
    handleSubmit: handleReviewSubmit,
    setValue: setReviewValue,
    watch: watchReview,
    reset: resetReview,
    setError: setReviewFieldError,
    setFocus: setReviewFocus,
    formState: { errors: reviewErrors, isSubmitting: isReviewSubmitting },
  } = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5, comment: "" } });
  const reviewRating = watchReview("rating");

  const { data: movie, isLoading } = useQuery({
    queryKey: queryKeys.movies.detail(id),
    queryFn: () => movieService.getMovieById(id),
  });

  const reviewsQuery = useQuery({
    queryKey: queryKeys.movies.reviews(id),
    queryFn: () => movieService.getReviews(id),
    enabled: Boolean(id),
  });

  const { data: shows } = useQuery({
    queryKey: queryKeys.shows.list({ movieId: id }),
    queryFn: () => bookingService.getShows({ movieId: id }),
    enabled: !!movie && movie.status === "now_showing",
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reviewId, data }) =>
      reviewId ? movieService.updateReview(id, reviewId, data) : movieService.addReview(id, data),
    onSuccess: async (result) => {
      setReviewNotice(
        result.created ? "Đánh giá đã được tạo." : "Đánh giá của bạn đã được cập nhật.",
      );
      setReviewState("success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.reviews(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all }),
      ]);
    },
  });

  const reviews = reviewsQuery.data || movie?.reviews || [];
  const existingReview = user?.id ? reviews.find((review) => review.user?.id === user.id) : null;
  const deleteReviewMutation = useMutation({
    mutationFn: () => movieService.deleteReview(id, existingReview.id),
    onSuccess: async () => {
      resetReview({ rating: 5, comment: "" });
      setReviewNotice("Đã xóa đánh giá của bạn.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.reviews(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
      ]);
    },
    onError: (error) => setReviewError(error.response?.data?.message || "Không thể xóa đánh giá."),
  });
  const moderateReviewMutation = useMutation({
    mutationFn: (reviewId) => movieService.moderateReview(id, reviewId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.reviews(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
      ]),
    onError: (error) =>
      setReviewError(error.response?.data?.message || "Không thể moderation đánh giá."),
  });

  useEffect(() => {
    if (!existingReview) return;
    resetReview({ rating: existingReview.rating, comment: existingReview.comment || "" });
  }, [existingReview, resetReview]);

  const submitReview = async (values) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (reviewSubmittingRef.current || reviewMutation.isPending || reviewState === "not-eligible")
      return;
    reviewSubmittingRef.current = true;
    setReviewError("");
    setReviewNotice("");
    setReviewState("submitting");
    try {
      await reviewMutation.mutateAsync({ reviewId: existingReview?.id, data: values });
    } catch (error) {
      const submissionState = getReviewSubmissionState(error);
      const fieldError = applyBackendErrors(error, {
        setError: setReviewFieldError,
        setFocus: setReviewFocus,
        allowedFields: ["rating", "comment"],
      });
      setReviewState(submissionState.kind);
      setReviewError(
        submissionState.kind === "error"
          ? fieldError || submissionState.message
          : submissionState.message,
      );
    } finally {
      reviewSubmittingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-20 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!movie) return <div className="container-custom py-20 text-center">Không tìm thấy phim</div>;

  const safePosterUrl = getSafeResourceUrl(movie.poster_url);
  const safeTrailerUrl = getSafeYouTubeEmbedUrl(movie.trailer_url);

  return (
    <div>
      {/* Hero Banner */}
      <div
        className="relative h-[60vh] min-h-[400px] bg-cover bg-center"
        style={{ backgroundImage: safePosterUrl ? `url("${safePosterUrl}")` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 container-custom pb-10">
          <div className="flex flex-col md:flex-row gap-8">
            <SafeImage
              src={safePosterUrl}
              alt={movie.title}
              className="w-48 rounded-xl shadow-2xl hidden md:block"
            />
            <div className="text-white">
              <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{movie.rating > 0 ? movie.rating.toFixed(1) : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration} phút</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {movie.release_date
                      ? new Date(movie.release_date).toLocaleDateString("vi-VN")
                      : "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Tag className="w-4 h-4" />
                  <span>{movie.genre}</span>
                </div>
              </div>
              <p className="text-gray-200 max-w-2xl line-clamp-3">{movie.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="font-heading text-2xl font-bold mb-4">Nội dung phim</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {movie.description}
              </p>
            </div>

            {safeTrailerUrl && (
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-4">Trailer</h2>
                <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-lg">
                  <iframe
                    src={safeTrailerUrl}
                    title={`Trailer ${movie.title}`}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            )}

            {/* Showtimes */}
            {movie.status === "now_showing" && shows && shows.length > 0 && (
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-4">Suất chiếu</h2>
                <div className="space-y-4">
                  {shows.map((show) => (
                    <div key={show.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <div className="flex flex-wrap justify-between items-center">
                        <div>
                          <p className="font-semibold">{show.screen?.theater?.name || "Rạp"}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(show.start_time).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-primary-600">
                            {show.price.toLocaleString()}đ
                          </span>
                          <Button size="sm" onClick={() => navigate(`/booking/${show.id}`)}>
                            Chọn ghế
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div>
              <h2 className="font-heading text-2xl font-bold mb-4">Đánh giá</h2>
              {user ? (
                <form
                  onSubmit={handleReviewSubmit(submitReview)}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6"
                  noValidate
                >
                  <FormAlert message={reviewError} />
                  {reviewNotice && (
                    <p role="status" className="mb-3 rounded-lg bg-green-500/10 p-3 text-green-500">
                      {reviewNotice}
                    </p>
                  )}
                  <p className="mb-3 text-sm text-gray-500">
                    Bạn cần có booking đã xác nhận cho phim này. Gửi lại sẽ cập nhật đánh giá hiện
                    có thay vì tạo bản trùng.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Đánh giá của bạn:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReviewValue("rating", r, { shouldValidate: true })}
                          disabled={
                            reviewMutation.isPending ||
                            isReviewSubmitting ||
                            reviewState === "not-eligible"
                          }
                          aria-label={`${r} sao`}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              r <= reviewRating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  {reviewErrors.rating && (
                    <p role="alert" className="text-sm text-error">
                      {reviewErrors.rating.message}
                    </p>
                  )}
                  <textarea
                    {...registerReview("comment")}
                    placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                    rows="3"
                    disabled={
                      reviewMutation.isPending ||
                      isReviewSubmitting ||
                      reviewState === "not-eligible"
                    }
                  />
                  {reviewErrors.comment && (
                    <p role="alert" className="text-sm text-error">
                      {reviewErrors.comment.message}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="mt-3"
                    isLoading={reviewMutation.isPending || isReviewSubmitting}
                    disabled={
                      reviewMutation.isPending ||
                      isReviewSubmitting ||
                      reviewState === "not-eligible"
                    }
                  >
                    {existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                  </Button>
                  {existingReview && (
                    <button
                      type="button"
                      disabled={deleteReviewMutation.isPending}
                      onClick={() =>
                        window.confirm("Xóa đánh giá của bạn?") && deleteReviewMutation.mutate()
                      }
                      className="ml-3 mt-3 text-sm text-red-500"
                    >
                      Xóa đánh giá
                    </button>
                  )}
                </form>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-6">
                  <p className="mb-2 text-sm text-gray-500">
                    Chỉ tài khoản có booking đã xác nhận cho phim này mới có thể đánh giá.
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Đăng nhập để viết đánh giá{" "}
                    <button
                      onClick={() => navigate("/login")}
                      className="text-primary-600 hover:underline"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                </div>
              )}

              {reviewsQuery.isPending ? (
                <div role="status" className="py-6 text-center">
                  Đang tải đánh giá...
                </div>
              ) : reviewsQuery.isError ? (
                <div role="alert" className="rounded-lg bg-red-500/10 p-4 text-red-500">
                  <p>Không thể tải danh sách đánh giá.</p>
                  <button
                    type="button"
                    onClick={() => reviewsQuery.refetch()}
                    className="mt-2 font-semibold underline"
                  >
                    Thử lại
                  </button>
                </div>
              ) : reviews.length === 0 ? (
                <p className="py-6 text-center text-gray-500">Chưa có đánh giá nào cho phim này.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-200 dark:border-gray-700 pb-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">{review.user?.name || "Người dùng"}</span>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(review.rating)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </p>
                      {user?.role === "admin" && (
                        <button
                          type="button"
                          disabled={moderateReviewMutation.isPending}
                          onClick={() =>
                            window.confirm("Gỡ đánh giá này theo quyền moderation?") &&
                            moderateReviewMutation.mutate(review.id)
                          }
                          className="mt-2 text-xs text-red-500"
                        >
                          Gỡ bởi moderator
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-24 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <Button
                className="w-full mb-3"
                onClick={() => {
                  if (movie.status === "now_showing" && shows?.length) {
                    navigate(`/booking/${shows[0].id}`);
                  }
                }}
                disabled={movie.status !== "now_showing"}
              >
                <Ticket className="w-4 h-4" />
                {movie.status === "now_showing" ? "Đặt vé ngay" : "Sắp chiếu"}
              </Button>
              <p className="text-sm text-gray-500">
                Thông tin đạo diễn, diễn viên và ngôn ngữ chưa được backend cung cấp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailPage;
