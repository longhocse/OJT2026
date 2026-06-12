import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MovieCard from "../common/MovieCard";
import { movieService } from "../../services/movieService";

const RecommendationWidget = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Gọi API recommendation (mock - backend sẽ xử lý)
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/recommendations?userId=${user?.id || ""}`
      );
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-80"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chưa có đề xuất. Hãy xem và đánh giá phim để nhận gợi ý tốt hơn!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {data.slice(0, 4).map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      <div className="text-center mt-8">
        <button
          onClick={() => navigate("/movies")}
          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
        >
          Xem tất cả đề xuất <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RecommendationWidget;