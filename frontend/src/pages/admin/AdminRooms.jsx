import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogService } from "../../services/catalogService";
import { queryKeys } from "../../services/queryKeys";

const AdminRooms = () => {
  const queryClient = useQueryClient();
  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms.list({}),
    queryFn: () => catalogService.getRooms(),
  });
  const deleteMutation = useMutation({
    mutationFn: catalogService.deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  });
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý phòng chiếu</h1>
        <Link
          to="/admin/rooms/create"
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Thêm phòng
        </Link>
      </div>
      {roomsQuery.isPending ? (
        <p role="status">Đang tải phòng...</p>
      ) : roomsQuery.isError ? (
        <p role="alert" className="text-red-500">
          Không thể tải phòng.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-800">
          <table className="min-w-[640px] w-full text-left">
            <caption className="sr-only">Danh sách phòng chiếu</caption>
            <thead>
              <tr>
                <th className="p-4">Phòng</th>
                <th className="p-4">Rạp</th>
                <th className="p-4">Tổng ghế</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roomsQuery.data.map((room) => (
                <tr key={room.id}>
                  <td className="p-4">{room.name}</td>
                  <td className="p-4">{room.theater?.name || "—"}</td>
                  <td className="p-4">{room.total_seats}</td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <Link
                        to={`/admin/rooms/edit/${room.id}`}
                        aria-label={`Sửa phòng ${room.name}`}
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
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminRooms;
