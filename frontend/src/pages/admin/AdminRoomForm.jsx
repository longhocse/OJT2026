import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import SeatLayoutEditor from "../../components/admin/SeatLayoutEditor";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";
import { applyBackendErrors } from "../../validation/formErrors";
import { roomSchema } from "../../validation/schemas";
import { useSelector } from "react-redux";

const emptyForm = { name: "", theater: { id: "" }, seats: [] };

const AdminRoomForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useSelector((state) => state.auth.user);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roomSchema),
    defaultValues: emptyForm,
    shouldFocusError: true,
  });
  const cinemasQuery = useQuery({
    queryKey: queryKeys.cinemas.list,
    queryFn: catalogService.getCinemas,
  });
  const roomQuery = useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: () => catalogService.getRoomById(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!roomQuery.data) return;
    reset({
      name: roomQuery.data.name || "",
      theater: { id: roomQuery.data.theater?.id || "" },
      seats: roomQuery.data.seats || [],
    });
  }, [reset, roomQuery.data]);

  useEffect(() => {
    if (
      !id &&
      currentUser?.role === "manager" &&
      currentUser?.theater_id
    ) {
      setValue("theater.id", currentUser.theater_id);
    }
  }, [id, currentUser, setValue]);

  const mutation = useMutation({
    mutationFn: (data) =>
      id ? catalogService.updateRoom(id, data) : catalogService.createRoom(data),
  });
  const submit = async (data) => {
    setFormError("");
    try {
      await mutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
      navigate("/admin/rooms");
    } catch (error) {
      setFormError(
        applyBackendErrors(error, {
          setError,
          setFocus,
          allowedFields: ["name", "theater.id", "seats"],
        }),
      );
    }
  };
  const theaterError = errors.theater?.id;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" aria-label="Quay lại" onClick={() => navigate("/admin/rooms")}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">{id ? "Sửa phòng chiếu" : "Thêm phòng chiếu"}</h1>
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-5 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <label className="block">
          <span className="mb-1 block">Tên phòng *</span>
          <input
            {...register("name")}
            aria-invalid={Boolean(errors.name)}
            className="w-full rounded-lg border p-2 dark:bg-gray-700"
          />
          {errors.name && (
            <span role="alert" className="text-sm text-red-500">
              {errors.name.message}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block">Rạp *</span>

          {currentUser?.role === "manager" ? (
            <>
              <input
                value={
                  cinemasQuery.data?.find(
                    (c) => c.id === currentUser.theater_id
                  )?.name || ""
                }
                readOnly
                className="w-full rounded-lg border p-2 dark:bg-gray-700"
              />

              <input
                type="hidden"
                {...register("theater.id")}
              />
            </>
          ) : (
            <select
              {...register("theater.id")}
              aria-invalid={Boolean(theaterError)}
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

          {theaterError && (
            <span role="alert" className="text-sm text-red-500">
              {theaterError.message}
            </span>
          )}
        </label>
        <SeatLayoutEditor
          value={watch("seats") || []}
          onChange={(seats) =>
            setValue("seats", seats, { shouldDirty: true, shouldValidate: true })
          }
          error={errors.seats}
        />
        <FormAlert
          message={formError || (cinemasQuery.isError ? "Không thể tải danh sách rạp." : "")}
        />
        <button
          type="submit"
          disabled={
            isSubmitting || mutation.isPending || cinemasQuery.isPending || cinemasQuery.isError
          }
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSubmitting || mutation.isPending ? "Đang lưu..." : "Lưu phòng"}
        </button>
      </form>
    </main>
  );
};

export default AdminRoomForm;
