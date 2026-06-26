import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { movieService } from "../../services/movieService";
import { queryKeys } from "../../services/queryKeys";
import { showService } from "../../services/showService";
import { applyBackendErrors } from "../../validation/formErrors";
import { showSchema } from "../../validation/schemas";

const emptyForm = {
  movie: { id: "" },
  screen: { id: "" },
  start_time: "",
  end_time: "",
  price: "",
};

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const addMinutes = (value, minutes) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalInput(new Date(date.getTime() + minutes * 60000));
};

const AdminShowForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cinemaId, setCinemaId] = useState("");
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
    resolver: zodResolver(showSchema),
    defaultValues: emptyForm,
    shouldFocusError: true,
  });

  const moviesQuery = useQuery({
    queryKey: queryKeys.movies.list({ page: 1, limit: 100 }),
    queryFn: () => movieService.getMovies({ page: 1, limit: 100 }),
  });
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.list,
    queryFn: catalogService.getCinemas,
  });
  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms.list({ cinemaId }),
    queryFn: () => catalogService.getRooms(cinemaId ? { cinemaId } : {}),
  });
  const showQuery = useQuery({
    queryKey: queryKeys.shows.detail(id),
    queryFn: () => showService.getAdminShowById(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!showQuery.data) return;
    const show = showQuery.data;
    setCinemaId(show.screen?.theater?.id || "");
    reset({
      movie: { id: show.movie?.id || "" },
      screen: { id: show.screen?.id || "" },
      start_time: toLocalInput(show.start_time),
      end_time: toLocalInput(show.end_time),
      price: show.price || "",
    });
  }, [reset, showQuery.data]);

  const selectedMovieId = watch("movie.id");
  const startTime = watch("start_time");
  useEffect(() => {
    const movie = moviesQuery.data?.data?.find((item) => item.id === selectedMovieId);
    if (!movie || !startTime) return;
    setValue("end_time", addMinutes(startTime, movie.duration), { shouldValidate: true });
  }, [moviesQuery.data, selectedMovieId, setValue, startTime]);

  const mutation = useMutation({
    mutationFn: (data) => (id ? showService.updateShow(id, data) : showService.createShow(data)),
  });

  const submit = async (data) => {
    setFormError("");
    try {
      await mutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.shows.all });
      navigate("/admin/shows");
    } catch (error) {
      setFormError(
        applyBackendErrors(error, {
          setError,
          setFocus,
          allowedFields: ["movie.id", "screen.id", "start_time", "end_time", "price"],
        }),
      );
    }
  };

  const unavailable =
    moviesQuery.isPending ||
    cinemasQuery.isPending ||
    roomsQuery.isPending ||
    moviesQuery.isError ||
    cinemasQuery.isError ||
    roomsQuery.isError;

  if (id && showQuery.isPending) return <p role="status">Đang tải suất chiếu...</p>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" aria-label="Quay lại" onClick={() => navigate("/admin/shows")}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">{id ? "Sửa suất chiếu" : "Thêm suất chiếu"}</h1>
      </div>

      {showQuery.isError ? (
        <FormAlert message="Không thể tải thông tin suất chiếu." />
      ) : (
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="grid grid-cols-1 gap-5 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 md:grid-cols-2"
        >
          <Field label="Phim *" error={errors.movie?.id}>
            <select
              {...register("movie.id")}
              className="w-full rounded-lg border p-2 dark:bg-gray-700"
            >
              <option value="">Chọn phim</option>
              {moviesQuery.data?.data?.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title} ({movie.duration} phút)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rạp *">
            <select
              value={cinemaId}
              onChange={(event) => {
                setCinemaId(event.target.value);
                setValue("screen.id", "", { shouldValidate: true });
              }}
              className="w-full rounded-lg border p-2 dark:bg-gray-700"
            >
              <option value="">Chọn rạp</option>
              {cinemasQuery.data?.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Phòng *" error={errors.screen?.id}>
            <select
              {...register("screen.id")}
              disabled={!cinemaId}
              className="w-full rounded-lg border p-2 dark:bg-gray-700 disabled:opacity-50"
            >
              <option value="">Chọn phòng</option>
              {roomsQuery.data?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.total_seats} ghế)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Giá vé cơ bản *" error={errors.price}>
            <input
              {...register("price")}
              type="number"
              min="1"
              step="1000"
              className="w-full rounded-lg border p-2 dark:bg-gray-700"
            />
          </Field>

          <Field label="Bắt đầu *" error={errors.start_time}>
            <input
              {...register("start_time")}
              type="datetime-local"
              min={toLocalInput(new Date())}
              className="w-full rounded-lg border p-2 dark:bg-gray-700"
            />
          </Field>

          <Field label="Kết thúc *" error={errors.end_time}>
            <input
              {...register("end_time")}
              type="datetime-local"
              readOnly
              className="w-full rounded-lg border bg-gray-100 p-2 dark:bg-gray-700"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Tự động tính theo thời lượng phim.
            </span>
          </Field>

          <div className="md:col-span-2">
            <FormAlert
              message={
                formError ||
                (unavailable ? "Không thể tải đầy đủ dữ liệu phim, rạp hoặc phòng." : "")
              }
            />
          </div>
          <div className="flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => navigate("/admin/shows")}
              className="rounded-lg bg-gray-200 px-4 py-2 dark:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending || unavailable}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Đang lưu..." : "Lưu suất chiếu"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
};

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium">{label}</span>
    {children}
    {error && (
      <span role="alert" className="mt-1 block text-sm text-red-500">
        {error.message}
      </span>
    )}
  </label>
);

export default AdminShowForm;
