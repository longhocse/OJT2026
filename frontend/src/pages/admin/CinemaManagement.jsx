// frontend/src/pages/admin/CinemaManagement.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Monitor } from 'lucide-react';
import api from '../../services/api';

const CinemaManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: cinemas, isLoading } = useQuery({
    queryKey: ['admin', 'cinemas'],
    queryFn: async () => {
      const res = await api.get('/cinemas');
      return res.data;
    }
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý rạp</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm rạp
        </button>
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
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-red-100 text-red-600 rounded">
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

export default CinemaManagement;