import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, RotateCcw, Search } from "lucide-react";
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
    <div className="space-y-8 text-slate-200">
      <div className="border-l-4 border-[#38BDF8] pl-4">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Nhật ký kiểm tra (Audit Logs)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi chi tiết các thao tác quản trị quan trọng trên hệ thống.
        </p>
      </div>

      {/* Filter Section - Elegant & Modern */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end rounded-2xl bg-slate-900/80 border border-white/5 p-5 backdrop-blur-xl shadow-xl">
        <div className="flex-1 w-full relative">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Action
          </label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors" />
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/50 focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
              placeholder="Ví dụ: movie.deactivate"
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Resource Type
          </label>
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#A78BFA] transition-colors" />
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#A78BFA]/50 focus:ring-2 focus:ring-[#A78BFA]/20 transition-all"
              placeholder="Ví dụ: Movie"
              value={filters.resourceType}
              onChange={(event) => updateFilter("resourceType", event.target.value)}
            />
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
          onClick={() => setFilters({ action: "", resourceType: "", page: 1 })}
        >
          <RotateCcw className="w-4 h-4" /> Xóa bộ lọc
        </button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-center shadow-inner backdrop-blur-sm">
          <p className="font-medium">🚨 {error?.message || "Không tải được audit log."}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="bg-slate-800/50 text-slate-300 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Thời gian</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Actor</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Action</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Resource</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.data || []).map((item) => (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString() : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.actor ? (
                          <div className="flex flex-col">
                            <div className="font-medium text-slate-200">{item.actor.name || item.actor.email}</div>
                            <div className="text-xs text-slate-500">{item.actor.email}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-white/5">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-lg bg-purple-500/10 px-3 py-1 font-mono text-[#A78BFA] border border-purple-500/20">
                          {item.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-slate-200">{item.resource_type}</div>
                          <div className="max-w-xs truncate text-xs text-slate-500">
                            {item.resource_id || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {parseMetadata(item.metadata_json) ? (
                          <div className="relative rounded-lg bg-slate-900/80 border border-white/5 p-3 hover:border-[#38BDF8]/50 transition-colors">
                            <pre className="max-h-32 w-full max-w-xs overflow-auto whitespace-pre-wrap text-xs text-slate-300 font-mono custom-scrollbar">
                              {parseMetadata(item.metadata_json)}
                            </pre>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {data?.data?.length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-slate-800 p-3">
                            <Search className="w-6 h-6 text-slate-600" />
                          </div>
                          <p>Chưa có audit log phù hợp với bộ lọc.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination - Modern Chip Style */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <span className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-slate-300">
              Trang {data?.pagination?.page || 1} / {data?.pagination?.pages || 1}
            </span>
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-[#38BDF8]/30 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                disabled={(data?.pagination?.page || 1) <= 1}
                onClick={() =>
                  setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                }
              >
                ← Trước
              </button>
              <button
                className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-800/50 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 hover:border-[#38BDF8]/30 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                disabled={(data?.pagination?.page || 1) >= (data?.pagination?.pages || 1)}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}