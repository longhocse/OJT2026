import React, { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Star, Clock, Calendar, Tag, User, MapPin, Monitor } from "lucide-react";
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

const upsertReview = (reviews, review) => {
  const list = Array.isArray(reviews) ? reviews : [];
  const existingIndex = list.findIndex((item) => item.id === review.id);
  if (existingIndex === -1) return [review, ...list];
  return list.map((item, index) => (index === existingIndex ? review : item));
};

const removeReview = (reviews, reviewId) =>
  Array.isArray(reviews) ? reviews.filter((review) => review.id !== reviewId) : [];

const getReviewSummary = (reviews, fallbackRating = 0, fallbackCount = 0) => {
  const list = Array.isArray(reviews) ? reviews : [];
  if (list.length === 0) return { rating: Number(fallbackRating) || 0, count: fallbackCount || 0 };
  const total = list.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return { rating: total / list.length, count: list.length };
};

const formatRating = (rating) =>
  Number(rating) > 0
    ? new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(rating))
    : "N/A";

const StarBar = ({ rating, size = "w-4 h-4" }) => (
  <div className="flex gap-1" aria-label={`${formatRating(rating)} sao`}>
    {[1, 2, 3, 4, 5].map((star) => {
      const fillPercent = Math.max(0, Math.min(1, Number(rating) - (star - 1))) * 100;
      return (
        <span key={star} className={`relative inline-block ${size}`}>
          <Star className={`absolute inset-0 ${size} text-gray-300`} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
            <Star className={`${size} text-yellow-400 fill-yellow-400`} />
          </span>
        </span>
      );
    })}
  </div>
);

const toDateInputValue = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateOptions = (days = 21) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      value: toDateInputValue(date),
      day: new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(date),
      month: new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(date),
      weekday: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
    };
  });

const showTime = (value) =>
  new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const groupShowsByTheater = (shows) => {
  const theaters = new Map();
  for (const show of shows || []) {
    const theater = show.screen?.theater;
    const theaterId = theater?.id || "unknown";
    if (!theaters.has(theaterId)) {
      theaters.set(theaterId, {
        id: theaterId,
        name: theater?.name || "Rạp",
        address: theater?.address || "",
        city: theater?.city || "Khác",
        screens: new Map(),
      });
    }
    const theaterGroup = theaters.get(theaterId);
    const screenId = show.screen?.id || "unknown-screen";
    if (!theaterGroup.screens.has(screenId)) {
      theaterGroup.screens.set(screenId, {
        id: screenId,
        name: show.screen?.name || "Phòng chiếu",
        shows: [],
      });
    }
    theaterGroup.screens.get(screenId).shows.push(show);
  }
  return [...theaters.values()].map((theater) => ({
    ...theater,
    screens: [...theater.screens.values()].map((screen) => ({
      ...screen,
      shows: screen.shows.sort(
        (left, right) => new Date(left.start_time) - new Date(right.start_time),
      ),
    })),
  }));
};

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewState, setReviewState] = useState("idle");
  const dateOptions = useMemo(() => buildDateOptions(21), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [selectedCity, setSelectedCity] = useState("all");
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

  const { data: shows = [], isLoading: isLoadingShows } = useQuery({
    queryKey: queryKeys.shows.list({ movieId: id, date: selectedDate }),
    queryFn: () => bookingService.getShows({ movieId: id, date: selectedDate }),
    enabled: !!movie && movie.status === "now_showing",
  });

  const { data: movieShows = [] } = useQuery({
    queryKey: queryKeys.shows.list({ movieId: id, scope: "date-indicators" }),
    queryFn: () => bookingService.getShows({ movieId: id }),
    enabled: !!movie && movie.status === "now_showing",
  });

  const { data: myBookings = [], isLoading: isLoadingMyBookings } = useQuery({
    queryKey: queryKeys.bookings.mine,
    queryFn: bookingService.getMyBookings,
    enabled: Boolean(user?.id && id),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reviewId, data }) =>
      reviewId ? movieService.updateReview(id, reviewId, data) : movieService.addReview(id, data),
    onSuccess: async (result) => {
      const review = {
        ...result.review,
        user: result.review.user || { id: user?.id, name: user?.name || "Bạn" },
      };
      let nextReviews = [];
      queryClient.setQueryData(queryKeys.movies.reviews(id), (current = []) => {
        nextReviews = upsertReview(current, review);
        return nextReviews;
      });
      queryClient.setQueryData(queryKeys.movies.detail(id), (current) => {
        if (!current) return current;
        const updatedReviews = upsertReview(current.reviews || nextReviews, review);
        const summary = getReviewSummary(updatedReviews, current.rating, current.reviewCount);
        return {
          ...current,
          rating: summary.rating,
          reviewCount: summary.count,
          reviews: updatedReviews,
        };
      });
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
  const datesWithShows = useMemo(
    () => new Set(movieShows.map((show) => toDateInputValue(show.start_time))),
    [movieShows],
  );
  const cityOptions = useMemo(
    () => [
      ...new Set(
        shows
          .map((show) => show.screen?.theater?.city)
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right)),
      ),
    ],
    [shows],
  );
  const visibleShows = useMemo(
    () =>
      selectedCity === "all"
        ? shows
        : shows.filter((show) => show.screen?.theater?.city === selectedCity),
    [selectedCity, shows],
  );
  const groupedShowtimes = useMemo(() => groupShowsByTheater(visibleShows), [visibleShows]);
  const existingReview = user?.id ? reviews.find((review) => review.user?.id === user.id) : null;
  const currentMovieId = String(id || "").toLowerCase();
  const hasUsedTicketForMovie = myBookings.some(
    (booking) =>
      booking.status === "used" &&
      String(booking.show?.movie?.id || "").toLowerCase() === currentMovieId,
  );
  const reviewNotAllowedByTicket = Boolean(user?.id && !hasUsedTicketForMovie);
  const isReviewDisabled =
    reviewMutation.isPending ||
    isReviewSubmitting ||
    reviewState === "not-eligible" ||
    reviewNotAllowedByTicket;
  const deleteReviewMutation = useMutation({
    mutationFn: () => movieService.deleteReview(id, existingReview.id),
    onSuccess: async () => {
      const deletedReviewId = existingReview.id;
      let nextReviews = [];
      queryClient.setQueryData(queryKeys.movies.reviews(id), (current = []) => {
        nextReviews = removeReview(current, deletedReviewId);
        return nextReviews;
      });
      queryClient.setQueryData(queryKeys.movies.detail(id), (current) => {
        if (!current) return current;
        const updatedReviews = removeReview(current.reviews, deletedReviewId);
        const summary = getReviewSummary(updatedReviews);
        return {
          ...current,
          rating: summary.rating,
          reviewCount: summary.count,
          reviews: updatedReviews,
        };
      });
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
    onSuccess: (_result, reviewId) => {
      queryClient.setQueryData(queryKeys.movies.reviews(id), (current = []) =>
        removeReview(current, reviewId),
      );
      queryClient.setQueryData(queryKeys.movies.detail(id), (current) => {
        if (!current) return current;
        const updatedReviews = removeReview(current.reviews, reviewId);
        const summary = getReviewSummary(updatedReviews);
        return {
          ...current,
          rating: summary.rating,
          reviewCount: summary.count,
          reviews: updatedReviews,
        };
      });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.reviews(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
      ]);
    },
    onError: (error) =>
      setReviewError(error.response?.data?.message || "Không thể moderation đánh giá."),
  });

  useEffect(() => {
    if (!existingReview) return;
    resetReview({ rating: existingReview.rating, comment: existingReview.comment || "" });
  }, [existingReview, resetReview]);

  useEffect(() => {
    if (hasUsedTicketForMovie && reviewState === "not-eligible") {
      setReviewState("idle");
      setReviewError("");
    }
  }, [hasUsedTicketForMovie, reviewState]);

  useEffect(() => {
    if (selectedCity !== "all" && !cityOptions.includes(selectedCity)) {
      setSelectedCity("all");
    }
  }, [cityOptions, selectedCity]);

  const submitReview = async (values) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (reviewSubmittingRef.current || isReviewDisabled) return;
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
  const reviewSummary = getReviewSummary(reviews, movie.rating, movie.reviewCount);

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
                  <span>{formatRating(reviewSummary.rating)}</span>
                  {reviewSummary.count > 0 && (
                    <span className="text-xs text-gray-300">({reviewSummary.count} đánh giá)</span>
                  )}
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
          <div className="order-1 lg:col-span-2">
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
            {movie.status === "now_showing" && (
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-4">Suất chiếu</h2>
                <section className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-2">
                      {dateOptions.map((date) => (
                        <button
                          key={date.value}
                          type="button"
                          onClick={() => setSelectedDate(date.value)}
                          className={`relative rounded-lg border px-3 py-2 pr-6 text-left transition ${
                            selectedDate === date.value
                              ? "border-primary-600 bg-primary-600 text-white"
                              : "border-gray-200 bg-white hover:border-primary-400 dark:border-gray-700 dark:bg-gray-900"
                          }`}
                        >
                          {datesWithShows.has(date.value) && (
                            <span
                              aria-label="Ngày có suất chiếu"
                              title="Ngày có suất chiếu"
                              className="absolute right-1.5 top-1 flex h-3.5 w-5 items-center justify-center rounded-[2px] bg-red-600 text-[9px] leading-none text-yellow-300 shadow-sm"
                            >
                              ★
                            </span>
                          )}
                          <span className="block text-xs opacity-75">{date.month}</span>
                          <span className="text-2xl font-bold leading-none">{date.day}</span>
                          <span className="ml-1 text-xs opacity-75">{date.weekday}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCity("all")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        selectedCity === "all"
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950"
                          : "border border-gray-200 hover:bg-white dark:border-gray-700 dark:hover:bg-gray-900"
                      }`}
                    >
                      Tất cả tỉnh/thành
                    </button>
                    {cityOptions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setSelectedCity(city)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          selectedCity === city
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950"
                            : "border border-gray-200 hover:bg-white dark:border-gray-700 dark:hover:bg-gray-900"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>

                  <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

                  {isLoadingShows ? (
                    <p role="status" className="py-8 text-center text-gray-500">
                      Đang tải suất chiếu...
                    </p>
                  ) : groupedShowtimes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
                      Không có suất chiếu cho ngày/tỉnh đã chọn.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {groupedShowtimes.map((theater) => (
                        <article
                          key={theater.id}
                          className="border-b pb-5 last:border-b-0 last:pb-0 dark:border-gray-700"
                        >
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold">{theater.name}</h3>
                            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <MapPin className="h-4 w-4" />
                              <span>{theater.city}</span>
                              {theater.address && <span>· {theater.address}</span>}
                            </p>
                          </div>
                          <div className="space-y-4">
                            {theater.screens.map((screen) => (
                              <div key={screen.id}>
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                  <Monitor className="h-4 w-4 text-gray-400" />
                                  {screen.name}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {screen.shows.map((show) => (
                                    <button
                                      key={show.id}
                                      type="button"
                                      onClick={() => navigate(`/booking/${show.id}`)}
                                      className="rounded-lg border border-primary-500/40 bg-white px-4 py-2 text-left hover:bg-primary-50 dark:bg-gray-900 dark:hover:bg-gray-700"
                                    >
                                      <span className="block font-bold text-primary-600">
                                        {showTime(show.start_time)}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {show.price.toLocaleString("vi-VN")}đ
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div id="reviews" className="order-2 lg:col-start-3 lg:row-start-1">
            <div className="rounded-xl bg-gray-50 p-6 dark:bg-gray-800">
              <h2 className="font-heading mb-4 text-xl font-bold">Thông tin phim</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Đạo diễn</dt>
                  <dd className="font-semibold">{movie.director || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Diễn viên</dt>
                  <dd className="font-semibold">{movie.cast || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Ngôn ngữ</dt>
                  <dd className="font-semibold">{movie.language || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Quốc gia</dt>
                  <dd className="font-semibold">{movie.country || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phân loại độ tuổi</dt>
                  <dd className="font-semibold">{movie.age_rating || "Chưa cập nhật"}</dd>
                </div>
              </dl>
            </div>

            <h2 className="font-heading mb-4 mt-6 text-2xl font-bold">
              Đánh giá
              {reviewSummary.count > 0 && (
                <span className="ml-2 text-base font-normal text-gray-500">
                  {formatRating(reviewSummary.rating)} sao · {reviewSummary.count} lượt
                </span>
              )}
            </h2>
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
                {reviewNotAllowedByTicket ? (
                  <p className="mb-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
                    Bạn chỉ có thể đánh giá sau khi vé của phim này đã được check-in và chuyển sang
                    trạng thái đã dùng.
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-gray-500">
                    Bạn cần có vé đã dùng cho phim này. Nếu đã từng đánh giá, gửi lại sẽ cập nhật
                    đánh giá hiện có.
                  </p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium">Đánh giá của bạn:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReviewValue("rating", r, { shouldValidate: true })}
                        disabled={isReviewDisabled}
                        aria-label={`${r} sao`}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            r <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
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
                  disabled={isReviewDisabled}
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
                  disabled={isReviewDisabled || isLoadingMyBookings}
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
                  Chỉ tài khoản có vé đã check-in/đã dùng cho phim này mới có thể đánh giá.
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
                      <StarBar rating={review.rating} />
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
      </div>
    </div>
  );
};

export default MovieDetailPage;
