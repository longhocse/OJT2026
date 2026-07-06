import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
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
  const field = (name, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        {...register(name)}
        {...props}
        aria-invalid={Boolean(errors[name])}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700"
      />
      {errors[name] && (
        <span role="alert" className="mt-1 block text-sm text-red-500">
          {errors[name].message}
        </span>
      )}
    </label>
  );

  if (movieQuery.isPending && id)
    return (
      <div role="status" className="p-6 text-center">
        Đang tải...
      </div>
    );

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" aria-label="Quay lại" onClick={() => navigate("/admin/movies")}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">{id ? "Sửa phim" : "Thêm phim mới"}</h1>
      </div>
      {movieQuery.isError ? (
        <FormAlert message="Không thể tải thông tin phim." />
      ) : (
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {field("title", "Tên phim *")}
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-sm font-medium">Thể loại</legend>
              <div className="flex flex-wrap gap-3">
                {(genresQuery.data || []).map((genre) => (
                  <label
                    key={genre.id}
                    className="flex items-center gap-2 rounded border px-3 py-2"
                  >
                    <input type="checkbox" value={genre.id} {...register("genreIds")} />
                    {genre.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {field("duration", "Thời lượng (phút) *", { type: "number", min: 1, max: 1000 })}
            {field("director", "Đạo diễn")}
            {field("cast", "Diễn viên")}
            {field("language", "Ngôn ngữ")}
            {field("country", "Quốc gia")}
            {field("age_rating", "Phân loại độ tuổi")}
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Mô tả</span>
              <textarea
                {...register("description")}
                rows="4"
                aria-invalid={Boolean(errors.description)}
                className="w-full rounded-lg border p-2 dark:bg-gray-700"
              />
              {errors.description && (
                <span role="alert" className="text-sm text-red-500">
                  {errors.description.message}
                </span>
              )}
            </label>
            {field("poster_url", "URL Poster", { type: "url" })}
            {field("trailer_url", "URL Trailer", { type: "url" })}
            {field("release_date", "Ngày phát hành", { type: "date" })}
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Trạng thái</span>
              <select
                {...register("status")}
                className="w-full rounded-lg border p-2 dark:bg-gray-700"
              >
                <option value="now_showing">Đang chiếu</option>
                <option value="coming_soon">Sắp chiếu</option>
                <option value="ended">Đã kết thúc</option>
              </select>
              {errors.status && (
                <span role="alert" className="text-sm text-red-500">
                  {errors.status.message}
                </span>
              )}
            </label>
          </div>
          <div className="mt-5">
            <FormAlert message={formError} />
          </div>
          <div className="mt-6 flex justify-end gap-4 border-t pt-6">
            <button
              type="button"
              onClick={() => navigate("/admin/movies")}
              className="rounded-lg bg-gray-200 px-4 py-2 dark:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting || mutation.isPending ? "Đang lưu..." : "Lưu phim"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
};

export default AdminMovieForm;
