import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/common/FormAlert";
import { paymentService } from "../../services/paymentService";
import { queryKeys } from "../../services/queryKeys";

const statuses = ["pending", "paid", "failed", "cancelled", "partially_refunded", "refunded"];
const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

export default function AdminPayments() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", provider: "" });
  const [qrPayload, setQrPayload] = useState("");
  const [notice, setNotice] = useState("");
  const params = {
    page,
    limit: 20,
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  };
  const query = useQuery({
    queryKey: queryKeys.admin.payments.list(params),
    queryFn: () => paymentService.getAdminPayments(params),
  });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.admin.payments.all });
  const cash = useMutation({
    mutationFn: paymentService.confirmCash,
    onSuccess: refresh,
    onError: (e) => setNotice(e.response?.data?.message || "Không thể xác nhận tiền mặt."),
  });
  const refund = useMutation({
    mutationFn: ({ id, amount }) => paymentService.refund(id, amount),
    onSuccess: refresh,
    onError: (e) => setNotice(e.response?.data?.message || "Không thể hoàn tiền."),
  });
  const checkIn = useMutation({
    mutationFn: paymentService.checkIn,
    onSuccess: (data) =>
      setNotice(data.alreadyCheckedIn ? "Vé đã được check-in trước đó." : "Check-in thành công."),
    onError: (e) => setNotice(e.response?.data?.message || "Check-in thất bại."),
  });
  const setFilter = (name, value) => {
    setPage(1);
    setFilters((old) => ({ ...old, [name]: value }));
  };
  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Thanh toán, hoàn tiền và check-in</h1>
      <div className="mb-5 grid gap-3 rounded-xl bg-white p-4 dark:bg-gray-800 md:grid-cols-3">
        <input
          aria-label="Tìm payment"
          placeholder="Email, phim, mã booking"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        />
        <select
          aria-label="Trạng thái payment"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        >
          <option value="">Mọi trạng thái</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Provider"
          value={filters.provider}
          onChange={(e) => setFilter("provider", e.target.value)}
          className="rounded border p-2 dark:bg-gray-700"
        >
          <option value="">Mọi provider</option>
          <option value="mock">mock</option>
          <option value="cash">cash</option>
          <option value="legacy">legacy</option>
        </select>
      </div>
      <section className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
        <h2 className="font-semibold">Quét QR / nhập payload</h2>
        <textarea
          aria-label="QR payload"
          value={qrPayload}
          onChange={(e) => setQrPayload(e.target.value)}
          rows="3"
          className="mt-2 w-full rounded border p-2 font-mono text-xs dark:bg-gray-700"
        />
        <button
          type="button"
          disabled={!qrPayload || checkIn.isPending}
          onClick={() => checkIn.mutate(qrPayload)}
          className="mt-2 rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Check-in vé
        </button>
      </section>
      <FormAlert message={notice} />
      {query.isPending ? (
        <p role="status">Đang tải payment...</p>
      ) : query.isError ? (
        <p role="alert">Không thể tải payment.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
            <table className="min-w-[900px] w-full text-left">
              <thead>
                <tr>
                  <th className="p-3">Booking</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Số tiền</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Hoàn</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((p) => (
                  <tr key={p.id} className="border-t dark:border-gray-700">
                    <td className="p-3 font-mono text-xs">{p.booking?.id || "—"}</td>
                    <td className="p-3">{p.provider}</td>
                    <td className="p-3">{money(p.amount)}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3">{money(p.refunded_amount)}</td>
                    <td className="p-3 space-x-2">
                      {p.provider === "cash" && p.status === "pending" && (
                        <button
                          onClick={() => cash.mutate(p.id)}
                          className="rounded bg-blue-600 px-2 py-1 text-white"
                        >
                          Xác nhận cash
                        </button>
                      )}
                      {["partially_refunded", "refunded"].includes(p.status) ||
                      p.booking?.status !== "cancelled" ? null : (
                        <button
                          onClick={() => refund.mutate({ id: p.id })}
                          className="rounded bg-amber-600 px-2 py-1 text-white"
                        >
                          Hoàn toàn bộ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trước
            </button>
            <span>
              {page}/{Math.max(1, query.data.pagination.pages)}
            </span>
            <button
              disabled={page >= query.data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </main>
  );
}
