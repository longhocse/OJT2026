import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Star, Clock, Calendar, Tag, User, ChevronRight, Ticket } from "lucide-react";
import { movieService } from "../services/movieService";
import { bookingService } from "../services/bookingService";
import Button from "../components/common/Button";

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  const { data: movie, isLoading, refetch } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => movieService.getMovieById(id),
  });

  const { data: shows } = useQuery({
    queryKey: ["shows", id],
    queryFn: () => bookingService.getShows({ movieId: id }),
    enabled: !!movie && movie.status === "now_showing",
  });

  const reviewMutation = useMutation({
    mutationFn: (data) => movieService.addReview(id, data),
    onSuccess: () => {
      setReviewText("");
      setReviewRating(5);
      refetch();
    },
  });

  const handleSubmitReview = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (reviewText.trim()) {
      reviewMutation.mutate({ rating: reviewRating, comment: reviewText });
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

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative h-[60vh] min-h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(${movie.poster_url})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 container-custom pb-10">
          <div className="flex flex-col md:flex-row gap-8">
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-48 rounded-xl shadow-2xl hidden md:block"
            />
            <div className="text-white">
              <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{movie.rating?.toFixed(1) || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration} phút</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(movie.release_date).toLocaleDateString("vi-VN")}</span>
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
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{movie.description}</p>
            </div>

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
                          <p className="text-sm text-gray-500">{new Date(show.start_time).toLocaleString("vi-VN")}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-primary-600">{show.price.toLocaleString()}đ</span>
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
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Đánh giá của bạn:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReviewRating(r)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-5 h-5 ${r <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                    rows="3"
                  />
                  <Button onClick={handleSubmitReview} className="mt-3" isLoading={reviewMutation.isPending}>
                    Gửi đánh giá
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    Đăng nhập để viết đánh giá{" "}
                    <button onClick={() => navigate("/login")} className="text-primary-600 hover:underline">
                      Đăng nhập ngay
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {movie.reviews?.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">{review.user?.name || "Người dùng"}</span>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(review.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                ))}
              </div>
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
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Đạo diễn:</span>
                  <span>Christopher Nolan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Diễn viên:</span>
                  <span>Leonardo DiCaprio, Joseph Gordon-Levitt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngôn ngữ:</span>
                  <span>Tiếng Anh (Phụ đề Việt)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailPage;