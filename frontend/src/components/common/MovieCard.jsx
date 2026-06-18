import React from "react";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300"
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.poster_url || "https://via.placeholder.com/300x450?text=No+Poster"}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-semibold text-white">{movie.rating?.toFixed(1) || "N/A"}</span>
        </div>
        {movie.status === "coming_soon" && (
          <div className="absolute bottom-2 left-2 bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded">
            Sắp chiếu
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg line-clamp-1">{movie.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{movie.duration} phút</span>
          <span className="w-1 h-1 rounded-full bg-gray-400"></span>
          <span>{movie.genre?.split(",")[0]}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(movie.status === "now_showing" ? `/movie/${movie.id}` : "#");
          }}
          className="mt-3 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {movie.status === "now_showing" ? "Đặt vé ngay" : "Xem chi tiết"}
        </button>
      </div>
    </motion.div>
  );
};

export default MovieCard;