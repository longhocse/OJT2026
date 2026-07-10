import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, CalendarClock, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { movieService } from "../../services/movieService";
import { queryKeys } from "../../services/queryKeys";
import { showService } from "../../services/showService";
import { applyBackendErrors } from "../../validation/formErrors";
import { showBulkSchema, showSchema } from "../../validation/schemas";

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

  if (id && showQuery.isPending) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div></div>;

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4 border-b border-white/5 pb-6">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate("/admin/shows")}
            className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {id ? "Sửa suất chiếu" : "Thêm suất chiếu"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                {id ? "Cập nhật thông tin suất chiếu." : "Thêm một suất chiếu mới vào hệ thống."}
              </p>
            </div>
          </div>
        </div>

        {showQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải thông tin suất chiếu.
          </div>
        ) : (
          <>
            {/* Mode Toggle (Chỉ hiện khi thêm mới) */}
            {!id && (
              <div className="mb-6 flex p-1 rounded-2xl bg-slate-900/80 border border-white/5 w-fit shadow-sm">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${mode === "single"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Tạo 1 suất
                </button>
                <button
                  type="button"
                  onClick={() => setMode("bulk")}
                  className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${mode === "bulk"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Tạo hàng loạt
                </button>
              </div>
            )}

            {/* Form Tạo 1 suất */}
            {(id || mode === "single") && (
              <form
                onSubmit={handleSubmit(submit)}
                noValidate
                className="rounded-2xl bg-slate-900/80 border border-white/5 p-6 md:p-8 backdrop-blur-sm shadow-2xl"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Phim *" error={errors.movie?.id}>
                    <select
                      {...register("movie.id")}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
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
                        setBulkValue("screen.id", "", { shouldValidate: true });
                      }}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
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
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all disabled:opacity-50"
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
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </Field>

                  <Field label="Bắt đầu *" error={errors.start_time}>
                    <input
                      {...register("start_time")}
                      type="datetime-local"
                      min={toLocalInput(new Date())}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </Field>

                  <Field label="Kết thúc *" error={errors.end_time}>
                    <input
                      {...register("end_time")}
                      type="datetime-local"
                      readOnly
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all read-only:opacity-60 cursor-not-allowed"
                    />
                    <span className="mt-1.5 block text-xs text-slate-400">
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
                  <div className="flex justify-end gap-3 md:col-span-2 mt-4 pt-6 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/shows")}
                      className="rounded-xl border border-white/10 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || mutation.isPending || unavailable}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {mutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {mutation.isPending ? "Đang lưu..." : "Lưu suất chiếu"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Form Tạo hàng loạt */}
            {!id && mode === "bulk" && (
              <form
                onSubmit={handleBulkSubmit(submitBulk)}
                noValidate
                className="rounded-2xl bg-slate-900/80 border border-white/5 p-6 md:p-8 backdrop-blur-sm shadow-2xl"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Phim *" error={bulkErrors.movie?.id}>
                    <select
                      {...registerBulk("movie.id")}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
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
                        setBulkValue("screen.id", "", { shouldValidate: true });
                      }}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                    >
                      <option value="">Chọn rạp</option>
                      {cinemasQuery.data?.map((cinema) => (
                        <option key={cinema.id} value={cinema.id}>
                          {cinema.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Phòng *" error={bulkErrors.screen?.id}>
                    <select
                      {...registerBulk("screen.id")}
                      disabled={!cinemaId}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all disabled:opacity-50"
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
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </Field>

                  <Field label="Từ ngày *" error={bulkErrors.dateFrom}>
                    <input
                      {...registerBulk("dateFrom")}
                      type="date"
                      min={toDateInput(new Date())}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </Field>

                  <Field label="Đến ngày *" error={bulkErrors.dateTo}>
                    <input
                      {...registerBulk("dateTo")}
                      type="date"
                      min={bulkValues.dateFrom || toDateInput(new Date())}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </Field>

                  {/* Weekdays Selector - Chip Style */}
                  <div className="md:col-span-2">
                    <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ngày áp dụng *
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {weekdays.map((day) => {
                        const checked = bulkValues.weekdays?.map(Number).includes(day.value);
                        return (
                          <label
                            key={day.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-blue-500/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10 has-[:checked]:text-blue-400 ${checked
                                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                : "border-white/10 bg-slate-800/50 text-slate-400"
                              }`}
                          >
                            <input
                              type="checkbox"
                              value={day.value}
                              {...registerBulk("weekdays")}
                              className="sr-only peer"
                            />
                            <div className={`h-2 w-2 rounded-full transition-all ${checked ? "bg-blue-400" : "bg-slate-600"}`} />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>
                    {bulkErrors.weekdays && (
                      <span role="alert" className="mt-2 block text-xs font-medium text-red-400">
                        {bulkErrors.weekdays.message}
                      </span>
                    )}
                  </div>

                  {/* Start Times Selector */}
                  <div className="md:col-span-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Giờ chiếu trong ngày *
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setBulkValue("startTimes", [...(bulkValues.startTimes || []), "18:00"], {
                            shouldValidate: true,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-full bg-slate-800/50 border border-white/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm giờ
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(bulkValues.startTimes || []).map((time, index) => (
                        <div key={`${index}-${time}`} className="flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-full px-3 py-1.5">
                          <input
                            type="time"
                            value={time}
                            onChange={(event) => {
                              const next = [...(bulkValues.startTimes || [])];
                              next[index] = event.target.value;
                              setBulkValue("startTimes", next, { shouldValidate: true });
                            }}
                            className="bg-transparent border-none text-sm text-slate-200 focus:outline-none focus:ring-0 w-24"
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
                            className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {bulkErrors.startTimes && (
                      <span role="alert" className="mt-2 block text-xs font-medium text-red-400">
                        {bulkErrors.startTimes.message}
                      </span>
                    )}
                  </div>

                  {/* Conflict Mode */}
                  <Field label="Khi trùng lịch" error={bulkErrors.conflictMode}>
                    <select
                      {...registerBulk("conflictMode")}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                    >
                      <option value="skip">Bỏ qua suất bị trùng/quá khứ, tạo phần còn lại</option>
                      <option value="fail">Dừng toàn bộ nếu có suất lỗi</option>
                    </select>
                  </Field>

                  {/* Bulk Preview */}
                  <div className="md:col-span-2">
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300">
                      <span className="font-semibold">Dự kiến tạo <span className="text-blue-400 font-bold">{bulkPreviewCount}</span> suất chiếu.</span>
                      <span className="block text-xs text-blue-400/70 mt-1">Giờ kết thúc sẽ tự tính theo thời lượng phim.</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <FormAlert
                      message={
                        formError ||
                        (unavailable ? "Không thể tải đầy đủ dữ liệu phim, rạp hoặc phòng." : "")
                      }
                    />
                    {bulkResult && (
                      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                        <p className="font-semibold">
                          Đã tạo <span className="text-emerald-300 font-bold">{bulkResult.created}</span>/{bulkResult.requested} suất chiếu.
                          {bulkResult.skipped > 0 && ` Bỏ qua ${bulkResult.skipped} suất.`}
                        </p>
                        {bulkResult.conflicts.length > 0 && (
                          <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-xs text-red-300">
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

                  <div className="flex justify-end gap-3 md:col-span-2 mt-4 pt-6 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/shows")}
                      className="rounded-xl border border-white/10 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-all"
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
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {bulkMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {bulkMutation.isPending ? "Đang tạo..." : "Tạo hàng loạt"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
};

// ----------------- COMPONENT FIELD ----------------- //

const Field = ({ label, error, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      {label}
    </span>
    {children}
    {error && (
      <span role="alert" className="text-xs font-medium text-red-400">
        {error.message}
      </span>
    )}
  </label>
);

export default AdminShowForm;