import React from "react";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SafeImage from "./SafeImage";

const formatRating = (rating) =>
  Number(rating) > 0
    ? new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Number(rating))
    : "N/A";

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  const reviewCount = Number(movie.reviewCount) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm border border-[#E6DFD9] hover:shadow-xl hover:border-[#B8744C] transition-all duration-300"
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      {/* Poster phim */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#F9F7F5]">
        <SafeImage
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badge đánh giá - Phong cách hiện đại */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md rounded-full pl-2 pr-3 py-1 flex items-center gap-1.5 shadow-sm border border-[#E6DFD9]">
          <Star className="w-3.5 h-3.5 text-[#DC2626] fill-[#DC2626]" />
          <span className="text-xs font-bold text-[#3E3A39]">{formatRating(movie.rating)}</span>
          {reviewCount > 0 && (
            <span className="text-[10px] font-medium text-[#6B625A]">({reviewCount})</span>
          )}
        </div>

        {/* Badge Sắp chiếu - Phong cách Đỏ cam */}
        {movie.status === "coming_soon" && (
          <div className="absolute bottom-3 left-3 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md shadow-[#DC2626]/30">
            Sắp chiếu
          </div>
        )}
      </div>

      {/* Nội dung phim */}
      <div className="p-4 md:p-5">
        <h3 className="font-extrabold text-[#3E3A39] text-lg line-clamp-1 group-hover:text-[#B8744C] transition-colors">
          {movie.title}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-[#6B625A]">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{movie.duration} phút</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-[#E6DFD9]"></span>
          <span>{movie.genre ? movie.genre.split(",")[0] : "Chưa phân loại"}</span>
        </div>

        {/* Nút hành động */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/movie/${movie.id}`);
          }}
          className="mt-4 w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-sm font-bold shadow-md shadow-[#DC2626]/20 hover:shadow-lg transition-all"
        >
          {movie.status === "now_showing" ? "Đặt vé ngay" : "Xem chi tiết"}
        </button>
      </div>
    </motion.div>
  );
};

export default MovieCard;