import React, { useEffect, useMemo, useState } from "react";
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
import { showBulkSchema, showSchema } from "../../validation/schemas";
import { useSelector } from "react-redux";

const emptyForm = {
  movie: { id: "" },
  screen: { id: "" },
  start_time: "",
  end_time: "",
  price: "",
};

const emptyBulkForm = {
  movie: { id: "" },
  screen: { id: "" },
  dateFrom: "",
  dateTo: "",
  weekdays: [1, 2, 3, 4, 5, 6, 0],
  startTimes: ["09:00", "13:30", "18:00", "21:30"],
  price: "",
  conflictMode: "skip",
};

const weekdays = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

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

const toDateInput = (value = new Date()) => toLocalInput(value).slice(0, 10);

const countBulkShows = ({ dateFrom, dateTo, weekdays: selectedWeekdays = [], startTimes = [] }) => {
  if (!dateFrom || !dateTo || dateFrom > dateTo || selectedWeekdays.length === 0) return 0;
  const selected = new Set(selectedWeekdays.map(Number));
  const current = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  let days = 0;
  while (current <= end) {
    if (selected.has(current.getDay())) days += 1;
    current.setDate(current.getDate() + 1);
  }
  return days * startTimes.filter(Boolean).length;
};

const AdminShowForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cinemaId, setCinemaId] = useState("");
  const [formError, setFormError] = useState("");
  const [mode, setMode] = useState("single");
  const [bulkResult, setBulkResult] = useState(null);
  const currentUser = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (
      !id &&
      currentUser?.role === "manager" &&
      currentUser?.theater_id
    ) {
      setCinemaId(currentUser.theater_id);
    }
  }, [id, currentUser]);

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
  const {
    register: registerBulk,
    handleSubmit: handleBulkSubmit,
    setValue: setBulkValue,
    setError: setBulkError,
    setFocus: setBulkFocus,
    watch: watchBulk,
    formState: { errors: bulkErrors, isSubmitting: isBulkSubmitting },
  } = useForm({
    resolver: zodResolver(showBulkSchema),
    defaultValues: {
      ...emptyBulkForm,
      dateFrom: toDateInput(new Date()),
      dateTo: toDateInput(new Date()),
    },
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
  const bulkValues = watchBulk();
  const bulkPreviewCount = useMemo(() => countBulkShows(bulkValues), [bulkValues]);
  useEffect(() => {
    const movie = moviesQuery.data?.data?.find((item) => item.id === selectedMovieId);
    if (!movie || !startTime) return;
    setValue("end_time", addMinutes(startTime, movie.duration), { shouldValidate: true });
  }, [moviesQuery.data, selectedMovieId, setValue, startTime]);

  const mutation = useMutation({
    mutationFn: (data) => (id ? showService.updateShow(id, data) : showService.createShow(data)),
  });
  const bulkMutation = useMutation({
    mutationFn: showService.createBulkShows,
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

  const submitBulk = async (data) => {
    setFormError("");
    setBulkResult(null);
    try {
      const result = await bulkMutation.mutateAsync(data);
      setBulkResult(result);
      await queryClient.invalidateQueries({ queryKey: queryKeys.shows.all });
    } catch (error) {
      setFormError(
        applyBackendErrors(error, {
          setError: setBulkError,
          setFocus: setBulkFocus,
          allowedFields: [
            "movie.id",
            "screen.id",
            "dateFrom",
            "dateTo",
            "weekdays",
            "startTimes",
            "price",
            "conflictMode",
          ],
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
        <>
          {!id && (
            <div className="mb-4 flex rounded-xl bg-white p-1 shadow dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`flex-1 rounded-lg px-4 py-2 font-semibold ${mode === "single" ? "bg-blue-600 text-white" : "text-gray-500"
                  }`}
              >
                Tạo 1 suất
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={`flex-1 rounded-lg px-4 py-2 font-semibold ${mode === "bulk" ? "bg-blue-600 text-white" : "text-gray-500"
                  }`}
              >
                Tạo hàng loạt
              </button>
            </div>
          )}

          {(id || mode === "single") && (
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
                {currentUser?.role === "manager" ? (
                  <input
                    value={
                      cinemasQuery.data?.find(
                        (c) => c.id === currentUser.theater_id
                      )?.name || ""
                    }
                    readOnly
                    className="w-full rounded-lg border p-2 dark:bg-gray-700"
                  />
                ) : (
                  <select
                    value={cinemaId}
                    onChange={(event) => {
                      setCinemaId(event.target.value);
                      setValue("screen.id", "", { shouldValidate: true });
                      setBulkValue("screen.id", "", { shouldValidate: true });
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
                )}
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

          {!id && mode === "bulk" && (
            <form
              onSubmit={handleBulkSubmit(submitBulk)}
              noValidate
              className="grid grid-cols-1 gap-5 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 md:grid-cols-2"
            >
              <Field label="Phim *" error={bulkErrors.movie?.id}>
                <select
                  {...registerBulk("movie.id")}
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
                {currentUser?.role === "manager" ? (
                  <input
                    value={
                      cinemasQuery.data?.find(
                        (c) => c.id === currentUser.theater_id
                      )?.name || ""
                    }
                    readOnly
                    className="w-full rounded-lg border p-2 dark:bg-gray-700"
                  />
                ) : (
                  <select
                    value={cinemaId}
                    onChange={(event) => {
                      setCinemaId(event.target.value);
                      setValue("screen.id", "", { shouldValidate: true });
                      setBulkValue("screen.id", "", { shouldValidate: true });
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
                )}
              </Field>

              <Field label="Phòng *" error={bulkErrors.screen?.id}>
                <select
                  {...registerBulk("screen.id")}
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

              <Field label="Giá vé cơ bản *" error={bulkErrors.price}>
                <input
                  {...registerBulk("price")}
                  type="number"
                  min="1"
                  step="1000"
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                />
              </Field>

              <Field label="Từ ngày *" error={bulkErrors.dateFrom}>
                <input
                  {...registerBulk("dateFrom")}
                  type="date"
                  min={toDateInput(new Date())}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                />
              </Field>

              <Field label="Đến ngày *" error={bulkErrors.dateTo}>
                <input
                  {...registerBulk("dateTo")}
                  type="date"
                  min={bulkValues.dateFrom || toDateInput(new Date())}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                />
              </Field>

              <div className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Ngày áp dụng *</span>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((day) => {
                    const checked = bulkValues.weekdays?.map(Number).includes(day.value);
                    return (
                      <label
                        key={day.value}
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${checked
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600"
                          }`}
                      >
                        <input
                          type="checkbox"
                          value={day.value}
                          {...registerBulk("weekdays")}
                          className="sr-only"
                        />
                        {day.label}
                      </label>
                    );
                  })}
                </div>
                {bulkErrors.weekdays && (
                  <span role="alert" className="mt-1 block text-sm text-red-500">
                    {bulkErrors.weekdays.message}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-sm font-medium">Giờ chiếu trong ngày *</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkValue("startTimes", [...(bulkValues.startTimes || []), "18:00"], {
                        shouldValidate: true,
                      })
                    }
                    className="rounded-lg bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
                  >
                    + Thêm giờ
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {(bulkValues.startTimes || []).map((time, index) => (
                    <div key={`${index}-${time}`} className="flex gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => {
                          const next = [...(bulkValues.startTimes || [])];
                          next[index] = event.target.value;
                          setBulkValue("startTimes", next, { shouldValidate: true });
                        }}
                        className="w-full rounded-lg border p-2 dark:bg-gray-700"
                      />
                      <button
                        type="button"
                        disabled={(bulkValues.startTimes || []).length <= 1}
                        onClick={() => {
                          const next = (bulkValues.startTimes || []).filter(
                            (_item, itemIndex) => itemIndex !== index,
                          );
                          setBulkValue("startTimes", next, { shouldValidate: true });
                        }}
                        className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
                {bulkErrors.startTimes && (
                  <span role="alert" className="mt-1 block text-sm text-red-500">
                    {bulkErrors.startTimes.message}
                  </span>
                )}
              </div>

              <Field label="Khi trùng lịch">
                <select
                  {...registerBulk("conflictMode")}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                >
                  <option value="skip">Bỏ qua suất bị trùng/quá khứ, tạo phần còn lại</option>
                  <option value="fail">Dừng toàn bộ nếu có suất lỗi</option>
                </select>
              </Field>

              <div className="rounded-lg bg-blue-500/10 p-4 text-sm text-blue-300">
                Dự kiến tạo <strong>{bulkPreviewCount}</strong> suất chiếu. Giờ kết thúc sẽ tự tính
                theo thời lượng phim.
              </div>

              <div className="md:col-span-2">
                <FormAlert
                  message={
                    formError ||
                    (unavailable ? "Không thể tải đầy đủ dữ liệu phim, rạp hoặc phòng." : "")
                  }
                />
                {bulkResult && (
                  <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
                    <p className="font-semibold">
                      Đã tạo {bulkResult.created}/{bulkResult.requested} suất chiếu.
                      {bulkResult.skipped > 0 && ` Bỏ qua ${bulkResult.skipped} suất.`}
                    </p>
                    {bulkResult.conflicts.length > 0 && (
                      <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-xs">
                        {bulkResult.conflicts.slice(0, 20).map((item, index) => (
                          <li key={`${item.date}-${item.time}-${index}`}>
                            {item.date} {item.time}: {item.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
                  disabled={
                    isBulkSubmitting ||
                    bulkMutation.isPending ||
                    unavailable ||
                    bulkPreviewCount <= 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {bulkMutation.isPending ? "Đang tạo..." : "Tạo hàng loạt"}
                </button>
              </div>
            </form>
          )}
        </>
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
