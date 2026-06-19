// frontend/src/pages/admin/AdminRooms.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

const AdminRooms = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý phòng chiếu</h1>
        <Link
          to="/admin/rooms/create"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phòng
        </Link>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-lg">
        <div className="p-8 text-center text-gray-500">
          <p>Tính năng đang phát triển!</p>
          <p className="text-sm mt-2">Vui lòng quay lại sau.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminRooms;