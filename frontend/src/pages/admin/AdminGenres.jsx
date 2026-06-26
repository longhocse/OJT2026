import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/common/FormAlert";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

export default function AdminGenres() {
  const client = useQueryClient();
  const [form, setForm] = useState({ id: null, name: "", description: "" });
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: queryKeys.genres.list, queryFn: catalogService.getGenres });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.genres.all });
  const save = useMutation({
    mutationFn: (value) =>
      value.id
        ? catalogService.updateGenre(value.id, { name: value.name, description: value.description })
        : catalogService.createGenre({ name: value.name, description: value.description }),
    onSuccess: () => {
      setForm({ id: null, name: "", description: "" });
      setError("");
      refresh();
    },
    onError: (requestError) =>
      setError(requestError.response?.data?.message || "Không thể lưu thể loại."),
  });
  const remove = useMutation({
    mutationFn: catalogService.deleteGenre,
    onSuccess: refresh,
    onError: (requestError) =>
      setError(requestError.response?.data?.message || "Không thể xóa thể loại."),
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Quản lý thể loại</h1>
      <FormAlert message={error} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
        className="grid gap-3 rounded-xl bg-white p-4 dark:bg-gray-800 md:grid-cols-3"
      >
        <input
          required
          maxLength="100"
          placeholder="Tên thể loại"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border p-2 dark:bg-gray-700"
        />
        <input
          maxLength="500"
          placeholder="Mô tả"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border p-2 dark:bg-gray-700"
        />
        <button disabled={save.isPending} className="rounded bg-blue-600 px-4 py-2 text-white">
          {form.id ? "Cập nhật" : "Thêm thể loại"}
        </button>
      </form>
      <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800">
        {query.isPending ? (
          <p className="p-5">Đang tải...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-3">Tên</th>
                <th className="p-3">Mô tả</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(query.data || []).map((genre) => (
                <tr key={genre.id} className="border-t">
                  <td className="p-3">{genre.name}</td>
                  <td className="p-3">{genre.description || "—"}</td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => setForm(genre)} className="text-blue-500">
                      Sửa
                    </button>
                    <button
                      onClick={() => window.confirm("Xóa thể loại này?") && remove.mutate(genre.id)}
                      className="text-red-500"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
