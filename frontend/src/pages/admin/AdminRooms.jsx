import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, Monitor, Building2, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const AdminRooms = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const cinemaId = searchParams.get("cinemaId") || "";
  const roomParams = cinemaId ? { cinemaId } : {};
  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms.list(roomParams),
    queryFn: () => catalogService.getRooms(roomParams),
  });
  const deleteMutation = useMutation({
    mutationFn: catalogService.deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  });

  return (
    <main className="min-h-screen w-full bg-[#0B1120] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header & Controls */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg shadow-pink-500/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Quản lý phòng chiếu</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Quản lý các phòng chiếu và sức chứa ghế của từng chi nhánh.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {cinemaId && (
              <Link
                to="/admin/cinemas"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:border-yellow-500/30 hover:text-yellow-400 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại rạp
              </Link>
            )}
            <Link
              to="/admin/rooms/create"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-pink-900/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Thêm phòng chiếu
            </Link>
          </div>
        </div>

        {/* Main Content */}
        {roomsQuery.isPending ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent"></div>
              <p className="text-slate-400 font-medium">Đang tải danh sách phòng...</p>
            </div>
          </div>
        ) : roomsQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            Không thể tải danh sách phòng. Vui lòng thử lại.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-[640px] w-full text-left text-sm text-slate-300">
                <caption className="sr-only">Danh sách phòng chiếu</caption>
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Phòng chiếu</th>
                    <th className="px-6 py-4 font-semibold">Chi nhánh rạp</th>
                    <th className="px-6 py-4 font-semibold text-center">Tổng ghế</th>
                    <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roomsQuery.data.map((room) => (
                    <tr key={room.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-800/50 text-pink-400 border border-white/5">
                            <Monitor className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-200 group-hover:text-pink-400 transition-colors">
                            {room.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {room.theater?.name ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium border border-white/5">
                            <Building2 className="w-3 h-3 text-amber-400" />
                            {room.theater.name}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block rounded-lg bg-slate-800/50 px-3 py-1 font-mono text-slate-200 border border-white/5">
                          {room.total_seats}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/admin/rooms/edit/${room.id}`}
                            aria-label={`Sửa phòng ${room.name}`}
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label={`Xóa phòng ${room.name}`}
                            disabled={deleteMutation.isPending}
                            onClick={() =>
                              window.confirm("Bạn có chắc muốn xóa phòng này?") &&
                              deleteMutation.mutate(room.id)
                            }
                            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roomsQuery.data.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Monitor className="w-8 h-8 text-slate-600 opacity-50" />
                          <p>Chưa có phòng chiếu nào.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminRooms;