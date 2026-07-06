import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageLoader from "../../components/common/PageLoader";
import { adminBookingService } from "../../services/adminBookingService";
import { queryKeys } from "../../services/queryKeys";

const parseMetadata = (metadataJson) => {
  if (!metadataJson) return "";
  try {
    return JSON.stringify(JSON.parse(metadataJson), null, 2);
  } catch (_error) {
    return metadataJson;
  }
};

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({ action: "", resourceType: "", page: 1 });
  const params = useMemo(
    () => ({
      page: filters.page,
      limit: 20,
      ...(filters.action.trim() && { action: filters.action.trim() }),
      ...(filters.resourceType.trim() && { resourceType: filters.resourceType.trim() }),
    }),
    [filters],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.admin.auditLogs.list(params),
    queryFn: () => adminBookingService.getAuditLogs(params),
  });

  const updateFilter = (field, value) =>
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-gray-400">
          Theo dõi các thao tác quản trị quan trọng trên hệ thống.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-800 bg-gray-950 p-4 md:grid-cols-3">
        <input
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
          placeholder="Action, ví dụ movie.deactivate"
          value={filters.action}
          onChange={(event) => updateFilter("action", event.target.value)}
        />
        <input
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
          placeholder="Resource, ví dụ Movie"
          value={filters.resourceType}
          onChange={(event) => updateFilter("resourceType", event.target.value)}
        />
        <button
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
          onClick={() => setFilters({ action: "", resourceType: "", page: 1 })}
        >
          Xóa bộ lọc
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <div className="rounded-lg border border-red-800 bg-red-950/60 p-4 text-red-200">
          {error?.message || "Không tải được audit log."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800 bg-gray-950 text-sm">
              <thead className="bg-gray-900 text-left text-gray-300">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(data?.data || []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-300">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.actor ? (
                        <div>
                          <div>{item.actor.name || item.actor.email}</div>
                          <div className="text-xs text-gray-500">{item.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-yellow-300">{item.action}</td>
                    <td className="px-4 py-3">
                      <div>{item.resource_type}</div>
                      <div className="max-w-xs truncate text-xs text-gray-500">
                        {item.resource_id || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <pre className="max-w-sm overflow-x-auto whitespace-pre-wrap rounded bg-gray-900 p-2 text-xs text-gray-300">
                        {parseMetadata(item.metadata_json) || "—"}
                      </pre>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-400" colSpan={5}>
                      Chưa có audit log phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Trang {data?.pagination?.page || 1}/{data?.pagination?.pages || 1}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded border border-gray-700 px-3 py-1 disabled:opacity-40"
                disabled={(data?.pagination?.page || 1) <= 1}
                onClick={() =>
                  setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                }
              >
                Trước
              </button>
              <button
                className="rounded border border-gray-700 px-3 py-1 disabled:opacity-40"
                disabled={(data?.pagination?.page || 1) >= (data?.pagination?.pages || 1)}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
