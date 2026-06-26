import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";
import { applyBackendErrors } from "../../validation/formErrors";
import { cinemaSchema } from "../../validation/schemas";

const emptyForm = { name: "", address: "", city: "", phone: "" };
const fields = [
  ["name", "Tên rạp *"],
  ["address", "Địa chỉ"],
  ["city", "Thành phố"],
  ["phone", "Số điện thoại"],
];

const AdminCinemaForm = () => {
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
    resolver: zodResolver(cinemaSchema),
    defaultValues: emptyForm,
    shouldFocusError: true,
  });

  const cinemaQuery = useQuery({
    queryKey: queryKeys.cinemas.detail(id),
    queryFn: () => catalogService.getCinemaById(id),
    enabled: Boolean(id),
  });
  useEffect(() => {
    if (!cinemaQuery.data) return;
    const { name, address, city, phone } = cinemaQuery.data;
    reset({ name, address: address || "", city: city || "", phone: phone || "" });
  }, [cinemaQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: (data) =>
      id ? catalogService.updateCinema(id, data) : catalogService.createCinema(data),
  });
  const submit = async (data) => {
    setFormError("");
    try {
      await mutation.mutateAsync(data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cinemas.all });
      navigate("/admin/cinemas");
    } catch (error) {
      setFormError(
        applyBackendErrors(error, {
          setError,
          setFocus,
          allowedFields: fields.map(([name]) => name),
        }),
      );
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" aria-label="Quay lại" onClick={() => navigate("/admin/cinemas")}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">{id ? "Sửa rạp" : "Thêm rạp mới"}</h1>
      </div>
      {cinemaQuery.isError ? (
        <FormAlert message="Không thể tải thông tin rạp." />
      ) : (
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="grid gap-5 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 md:grid-cols-2"
        >
          {fields.map(([name, label]) => (
            <label key={name} className="block">
              <span className="mb-1 block">{label}</span>
              <input
                {...register(name)}
                aria-invalid={Boolean(errors[name])}
                className="w-full rounded-lg border p-2 dark:bg-gray-700"
              />
              {errors[name] && (
                <span role="alert" className="mt-1 block text-sm text-red-500">
                  {errors[name].message}
                </span>
              )}
            </label>
          ))}
          <div className="md:col-span-2">
            <FormAlert message={formError} />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending || cinemaQuery.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting || mutation.isPending ? "Đang lưu..." : "Lưu rạp"}
          </button>
        </form>
      )}
    </main>
  );
};

export default AdminCinemaForm;
