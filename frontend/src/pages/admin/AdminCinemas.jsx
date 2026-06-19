// frontend/src/pages/admin/AdminCinemas.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Monitor } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const AdminCinemas = () => {
  const { data: cinemas, isLoading } = useQuery({
    queryKey: ['admin', 'cinemas'],
    queryFn: () => api.get('/cinemas').then(res => res.data)
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý rạp</h1>
        <Link
          to="/admin/cinemas/create"
          className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm rạp
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cinemas?.map((cinema) => (
          <div key={cinema.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{cinema.name}</h3>
                <p className="text-sm text-gray-500">{cinema.address}</p>
                <p className="text-sm text-gray-500">{cinema.city}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/admin/cinemas/edit/${cinema.id}`}
                  className="p-2 bg-yellow-500/10 text-yellow-600 rounded-lg hover:bg-yellow-500/20 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Monitor className="w-4 h-4" />
              <span>{cinema.screens?.length || 0} phòng chiếu</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCinemas;