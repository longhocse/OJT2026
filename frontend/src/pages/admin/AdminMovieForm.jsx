import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Film, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { movieService } from "../../services/movieService";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";
import { applyBackendErrors } from "../../validation/formErrors";
import { movieSchema } from "../../validation/schemas";

const emptyMovie = {
  title: "",
  description: "",
  genreIds: [],
  duration: "",
  director: "",
  cast: "",
  language: "",
  country: "",
  age_rating: "",
  poster_url: "",
  trailer_url: "",
  release_date: "",
  status: "now_showing",
};
const allowedFields = Object.keys(emptyMovie);

const AdminMovieForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(movieSchema),
    defaultValues: emptyMovie,
    shouldFocusError: true,
  });

  const movieQuery = useQuery({
    queryKey: queryKeys.movies.detail(id),
    queryFn: () => movieService.getMovieById(id),
    enabled: Boolean(id),
  });
  const genresQuery = useQuery({
    queryKey: queryKeys.genres.list,
    queryFn: catalogService.getGenres,
  });

  // --- MUTATION MỚI: Gọi AI tạo mô tả ---
  const generateDescMutation = useMutation({
    mutationFn: (payload) => movieService.generateDescription(payload),
    onSuccess: (data) => {
      setValue("description", data.description, { shouldValidate: true });
      setFormError("");
    },
    onError: (error) => {
      setFormError(
        error.response?.data?.error || error.message || "Không thể tạo mô tả bằng AI."
      );
    },
  });
  // --------------------------------------

  useEffect(() => {
    if (!movieQuery.data) return;
    const movie = movieQuery.data;
    reset({
      title: movie.title || "",
      description: movie.description || "",
      genreIds: movie.genres.map((genre) => genre.id),
      duration: movie.duration || "",
      director: movie.director || "",
      cast: movie.cast || "",
      language: movie.language || "",
      country: movie.country || "",
      age_rating: movie.age_rating || "",
      poster_url: movie.poster_url || "",
      trailer_url: movie.trailer_url || "",
      release_date: movie.release_date ? movie.release_date.split("T")[0] : "",
      status: movie.status || "now_showing",
    });
  }, [movieQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: (data) =>
      id ? movieService.updateMovie(id, data) : movieService.createMovie(data),
  });
  const submit = async (data) => {
    setFormError("");
    try {
      await mutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.movies.all });
      navigate("/admin/movies");
    } catch (error) {
      setFormError(applyBackendErrors(error, { setError, setFocus, allowedFields }));
    }
  };

  if (movieQuery.isPending && id) {
    return (
      <div className="min-h-screen w-full bg-[#0B1120] flex justify-center items-center">
        <div className="flex flex-col items-center gap-3 bg-slate-900/80 p-8 rounded-2xl border border-white/5">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-400 font-medium">Đang tải thông tin phim...</p>
        </div>
      </div>
    );
  }

  const field = (name, label, props = {}) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        {label}
      </span>
      <input
        {...register(name)}
        {...props}
        aria-invalid={Boolean(errors[name])}
        className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
      {errors[name] && (
        <span role="alert" className="text-xs font-medium text-red-400">
          {errors[name].message}
        </span>
      )}
    </label>
  );

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4 border-b border-white/5 pb-6">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate("/admin/movies")}
            className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {id ? "Sửa phim" : "Thêm phim mới"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                {id ? "Cập nhật thông tin chi tiết của phim." : "Điền thông tin để thêm một bộ phim mới vào hệ thống."}
              </p>
            </div>
          </div>
        </div>

        {movieQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải thông tin phim.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(submit)}
            noValidate
            className="rounded-2xl bg-slate-900/80 border border-white/5 p-6 md:p-8 backdrop-blur-sm shadow-2xl"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {field("title", "Tên phim *")}

              {/* Genres Selector - Modern Pill Buttons */}
              <fieldset className="md:col-span-2">
                <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Thể loại <span className="text-red-400">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(genresQuery.data || []).map((genre) => (
                    <label
                      key={genre.id}
                      className="group relative flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-slate-800/50 px-4 py-2 transition-all hover:border-blue-500/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10 has-[:checked]:text-blue-400"
                    >
                      <input
                        type="checkbox"
                        value={genre.id}
                        {...register("genreIds")}
                        className="sr-only peer"
                      />
                      <div className="h-2 w-2 rounded-full bg-slate-600 transition-all peer-checked:bg-blue-400 peer-checked:shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm font-medium text-slate-400 transition-colors group-hover:text-slate-200 peer-checked:text-blue-400">
                        {genre.name}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.genreIds && (
                  <span role="alert" className="mt-2 block text-xs font-medium text-red-400">
                    {errors.genreIds.message}
                  </span>
                )}
              </fieldset>

              {field("duration", "Thời lượng (phút) *", { type: "number", min: 1, max: 1000 })}
              {field("director", "Đạo diễn")}
              {field("cast", "Diễn viên")}
              {field("language", "Ngôn ngữ")}
              {field("country", "Quốc gia")}
              {field("age_rating", "Phân loại độ tuổi")}

              {/* --- Mô tả - Textarea (Đã thêm nút AI) --- */}
              <label className="flex flex-col gap-1.5 md:col-span-2 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    Mô tả
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const title = watch("title");
                      const director = watch("director");
                      const cast = watch("cast");

                      // Lấy thể loại đầu tiên (vì có thể chọn nhiều)
                      const selectedGenreIds = watch("genreIds");
                      let genreName = "";
                      if (selectedGenreIds && selectedGenreIds.length > 0) {
                        const firstGenre = (genresQuery.data || []).find(g => g.id === selectedGenreIds[0]);
                        genreName = firstGenre ? firstGenre.name : "";
                      }

                      if (!title) {
                        setFormError("Vui lòng nhập Tên phim trước khi tạo mô tả bằng AI.");
                        return;
                      }

                      generateDescMutation.mutate({ title, genre: genreName, director, cast });
                    }}
                    disabled={generateDescMutation.isPending || !watch("title")}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/10 hover:border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generateDescMutation.isPending ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent"></div>
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generateDescMutation.isPending ? "Đang viết..." : "Tạo bằng AI"}
                  </button>
                </div>

                <textarea
                  {...register("description")}
                  rows="4"
                  aria-invalid={Boolean(errors.description)}
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y"
                  placeholder="Nhập mô tả phim hoặc nhấn nút 'Tạo bằng AI' bên trên..."
                />
                {errors.description && (
                  <span role="alert" className="text-xs font-medium text-red-400">
                    {errors.description.message}
                  </span>
                )}
              </label>
              {/* -------------------------------------- */}

              {field("poster_url", "URL Poster", { type: "url" })}
              {field("trailer_url", "URL Trailer", { type: "url" })}
              {field("release_date", "Ngày phát hành", { type: "date" })}

              {/* Status Select */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái</span>
                <select
                  {...register("status")}
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                >
                  <option value="now_showing">Đang chiếu</option>
                  <option value="coming_soon">Sắp chiếu</option>
                  <option value="ended">Đã kết thúc</option>
                </select>
                {errors.status && (
                  <span role="alert" className="text-xs font-medium text-red-400">
                    {errors.status.message}
                  </span>
                )}
              </label>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <FormAlert message={formError} />
              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/admin/movies")}
                  className="rounded-xl border border-white/10 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || mutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting || mutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting || mutation.isPending ? "Đang lưu..." : "Lưu phim"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

export default AdminMovieForm;