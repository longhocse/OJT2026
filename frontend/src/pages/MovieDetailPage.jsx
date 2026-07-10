import React, { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Star, Clock, Calendar, MapPin, Monitor, Play } from "lucide-react";
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

// --- Các hàm tiện ích giữ nguyên ---
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
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Number(rating))
    : "N/A";

// --- Components UI màu sắc mới ---
const StarBar = ({ rating, size = "w-4 h-4", showNumber = false }) => (
  <div className="flex items-center gap-2" aria-label={`${formatRating(rating)} sao`}>
    <div className="flex gap-0.5">
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
    {showNumber && <span className="text-sm font-bold text-[#2b2d42]">{formatRating(rating)}</span>}
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

  // --- API Queries ---
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

  // --- Mutations ---
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
      setReviewNotice(result.created ? "Đánh giá đã được tạo." : "Đánh giá của bạn đã được cập nhật.");
      setReviewState("success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.reviews(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all }),
      ]);
    },
  });

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

  // --- Logic Side Effects ---
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

  // --- Actions ---
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

  // --- Loading states ---
  if (isLoading) {
    return (
      <div className="bg-[#FAFAFA] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#DC2626] border-t-transparent"></div>
          <p className="text-[#2b2d42] font-medium">Đang tải thông tin phim...</p>
        </div>
      </div>
    );
  }

  if (!movie) return <div className="bg-[#FAFAFA] container-custom py-20 text-center text-[#2b2d42] font-bold text-xl">Không tìm thấy phim</div>;

  const safePosterUrl = getSafeResourceUrl(movie.poster_url);
  const safeTrailerUrl = getSafeYouTubeEmbedUrl(movie.trailer_url);
  const reviewSummary = getReviewSummary(reviews, movie.rating, movie.reviewCount);

  return (
    <div className="bg-[#FAFAFA] min-h-screen text-[#2b2d42] pb-20 font-sans">

      {/* 1. HERO BANNER (Phong cách Tripo Games: Sáng, bo góc, 3D) */}
      <div className="relative bg-[#F3F4F6] pt-24 pb-16 overflow-hidden">
        {/* Background pattern trang trí */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FEE2E2] rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FEF3C7] rounded-full blur-[80px] opacity-50 pointer-events-none"></div>

        <div className="relative z-10 container-custom grid md:grid-cols-2 gap-12 items-center">
          {/* Cột trái: Poster */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-64 md:w-80 rounded-3xl shadow-2xl overflow-hidden border-4 border-white transform hover:scale-[1.02] transition duration-300">
              <SafeImage
                src={safePosterUrl}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover bg-white"
              />
              {/* Badge 3D nếu có thể loại */}
              {movie.genre && (
                <div className="absolute top-4 left-4 bg-[#DC2626] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                  {movie.genre}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Thông tin phim */}
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">{movie.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#DC2626]" />
                <span className="font-semibold">{movie.duration} phút</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#DC2626]" />
                <span className="font-semibold">
                  {movie.release_date ? new Date(movie.release_date).toLocaleDateString("vi-VN") : "—"}
                </span>
              </div>
              <div className="bg-[#FDE047] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-[#2b2d42] font-bold">
                <Star className="w-4 h-4 fill-[#2b2d42]" />
                <span>{formatRating(reviewSummary.rating)}</span>
                <span className="text-xs font-normal text-gray-600">({reviewSummary.count})</span>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed max-w-lg line-clamp-4">{movie.description}</p>

            {/* Nút hành động */}
            {movie.status === "now_showing" && (
              <div className="flex flex-wrap gap-4 mt-4">
                <a href="#showtimes" className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-8 py-3.5 rounded-2xl transition shadow-md shadow-[#DC2626]/30 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Đặt vé ngay
                </a>
                {safeTrailerUrl && (
                  <a href="#trailer" className="bg-white border border-gray-200 hover:bg-gray-50 text-[#2b2d42] font-bold px-8 py-3.5 rounded-2xl transition flex items-center gap-2">
                    <Play className="w-5 h-5 fill-[#2b2d42]" /> Xem Trailer
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. NỘI DUNG CHI TIẾT */}
      <div className="container-custom py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Cột trái: Mô tả, Trailer, Suất chiếu */}
        <div className="lg:col-span-2 space-y-12">

          {/* Mô tả */}
          <div id="description" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-4">Nội dung phim</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              {movie.description}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Đạo diễn</p>
                <p className="font-semibold">{movie.director || "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Quốc gia</p>
                <p className="font-semibold">{movie.country || "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Diễn viên</p>
                <p className="font-semibold">{movie.cast || "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Phân loại</p>
                <p className="font-semibold">{movie.age_rating || "Chưa cập nhật"}</p>
              </div>
            </div>
          </div>

          {/* Trailer */}
          {safeTrailerUrl && (
            <div id="trailer" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">Trailer</h2>
              <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg relative">
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

          {/* SUẤT CHIẾU */}
          {movie.status === "now_showing" && (
            <div id="showtimes" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Suất chiếu</h2>

              {/* Chọn ngày */}
              <div className="overflow-x-auto pb-2 mb-6">
                <div className="flex min-w-max gap-2">
                  {dateOptions.map((date) => (
                    <button
                      key={date.value}
                      type="button"
                      onClick={() => setSelectedDate(date.value)}
                      className={`relative rounded-2xl border-2 px-4 py-3 text-left transition-all min-w-[70px] ${selectedDate === date.value
                          ? "border-[#DC2626] bg-[#FEF2F2] shadow-sm"
                          : "border-transparent bg-[#F3F4F6] hover:bg-gray-200"
                        }`}
                    >
                      {datesWithShows.has(date.value) && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#FDE047] rounded-full border-2 border-white shadow-sm"></div>
                      )}
                      <span className="block text-[10px] opacity-60 font-semibold">{date.weekday}</span>
                      <span className="text-2xl font-bold leading-none">{date.day}</span>
                      <span className="block text-[10px] opacity-60 font-semibold">{date.month}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn thành phố */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedCity("all")}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${selectedCity === "all"
                      ? "bg-[#DC2626] text-white"
                      : "bg-[#F3F4F6] hover:bg-gray-200 text-[#2b2d42]"
                    }`}
                >
                  Tất cả
                </button>
                {cityOptions.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${selectedCity === city
                        ? "bg-[#DC2626] text-white"
                        : "bg-[#F3F4F6] hover:bg-gray-200 text-[#2b2d42]"
                      }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Danh sách rạp */}
              {isLoadingShows ? (
                <p role="status" className="py-8 text-center text-gray-500">Đang tải suất chiếu...</p>
              ) : groupedShowtimes.length === 0 ? (
                <div className="rounded-2xl bg-[#F3F4F6] border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  Không có suất chiếu cho ngày này.
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedShowtimes.map((theater) => (
                    <div key={theater.id} className="bg-[#F9FAFB] rounded-2xl p-5 border border-gray-100">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-[#DC2626]" /> {theater.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 ml-7">
                          {theater.address} · {theater.city}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {theater.screens.map((screen) => (
                          <div key={screen.id}>
                            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600">
                              <Monitor className="w-4 h-4" />
                              {screen.name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {screen.shows.map((show) => (
                                <button
                                  key={show.id}
                                  type="button"
                                  onClick={() => navigate(`/booking/${show.id}`)}
                                  className="bg-white border border-gray-200 hover:border-[#DC2626] hover:shadow-md transition shadow-sm rounded-2xl px-4 py-3 text-left min-w-[80px] group"
                                >
                                  <span className="block font-bold text-[#DC2626] group-hover:scale-105 transition">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. SIDEBAR: ĐÁNH GIÁ */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-6">

            {/* Header đánh giá */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Đánh giá</h2>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-lg">{formatRating(reviewSummary.rating)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">({reviewSummary.count} lượt đánh giá)</p>

            {/* Form đánh giá của người dùng */}
            {user ? (
              <form
                onSubmit={handleReviewSubmit(submitReview)}
                className="bg-[#F3F4F6] rounded-2xl p-4 mb-6"
                noValidate
              >
                <FormAlert message={reviewError} />
                {reviewNotice && (
                  <p role="status" className="mb-3 rounded-xl bg-green-500/10 p-2 text-xs text-green-600 text-center font-medium">
                    {reviewNotice}
                  </p>
                )}
                {reviewNotAllowedByTicket ? (
                  <p className="mb-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-xl">
                    Bạn cần có vé đã dùng cho phim này để đánh giá.
                  </p>
                ) : (
                  <p className="mb-3 text-xs text-gray-500">
                    Đánh giá sau khi xem phim.
                  </p>
                )}

                {/* Chọn sao */}
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReviewValue("rating", r, { shouldValidate: true })}
                      disabled={isReviewDisabled}
                      className="focus:outline-none transition hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${r <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                {reviewErrors.rating && <p className="text-xs text-red-500 text-center mb-2">{reviewErrors.rating.message}</p>}

                <textarea
                  {...registerReview("comment")}
                  placeholder="Bạn nghĩ gì về phim này?"
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white resize-none text-sm focus:ring-2 focus:ring-[#DC2626] outline-none"
                  rows="2"
                  disabled={isReviewDisabled}
                />
                {reviewErrors.comment && <p className="text-xs text-red-500 mt-1">{reviewErrors.comment.message}</p>}

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-2 rounded-xl text-sm transition shadow-md shadow-[#DC2626]/20"
                    isLoading={reviewMutation.isPending || isReviewSubmitting}
                    disabled={isReviewDisabled || isLoadingMyBookings}
                  >
                    {existingReview ? "Cập nhật" : "Gửi đánh giá"}
                  </Button>
                  {existingReview && (
                    <button
                      type="button"
                      disabled={deleteReviewMutation.isPending}
                      onClick={() => window.confirm("Xóa đánh giá của bạn?") && deleteReviewMutation.mutate()}
                      className="text-red-500 text-sm font-semibold hover:underline px-3"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 text-center mb-6 border border-dashed border-gray-300">
                <p className="mb-2 text-sm text-gray-500">Đăng nhập để viết đánh giá</p>
                <button onClick={() => navigate("/login")} className="bg-[#2b2d42] text-white font-bold py-2 px-6 rounded-xl text-sm hover:bg-gray-800 transition w-full">
                  Đăng nhập ngay
                </button>
              </div>
            )}

            {/* Danh sách Review */}
            {reviewsQuery.isPending ? (
              <div className="py-6 text-center text-sm text-gray-400">Đang tải đánh giá...</div>
            ) : reviewsQuery.isError ? (
              <div className="text-center text-sm text-red-500">
                <p>Lỗi tải đánh giá.</p>
                <button onClick={() => reviewsQuery.refetch()} className="underline">Thử lại</button>
              </div>
            ) : reviews.length === 0 ? (
              <p className="py-6 text-center text-gray-400 text-sm">Chưa có đánh giá nào.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#2b2d42] text-white rounded-full flex items-center justify-center font-bold text-xs uppercase">
                          {review.user?.name?.charAt(0) || "U"}
                        </div>
                        <span className="font-semibold text-sm">{review.user?.name || "Người dùng"}</span>
                      </div>
                      <StarBar rating={review.rating} size="w-3 h-3" />
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString("vi-VN") : "—"}
                    </p>
                    {user?.role === "admin" && (
                      <button
                        type="button"
                        disabled={moderateReviewMutation.isPending}
                        onClick={() => window.confirm("Gỡ đánh giá này?") && moderateReviewMutation.mutate(review.id)}
                        className="mt-2 text-xs text-red-500 font-medium hover:underline"
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