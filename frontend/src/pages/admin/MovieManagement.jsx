// frontend/src/pages/admin/MovieManagement.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import api from '../../services/api';

const MovieManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const queryClient = useQueryClient();

  // Fetch movies
  const { data: movies, isLoading } = useQuery({
    queryKey: ['admin', 'movies'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=100');
      return res.data.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/movies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'movies']);
    }
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý phim</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm phim
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Phim</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Thể loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Đánh giá</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {movies?.map((movie) => (
              <tr key={movie.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={movie.poster_url} alt={movie.title} className="w-10 h-14 object-cover rounded" />
                    <span className="font-medium">{movie.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{movie.genre}</td>
                <td className="px-6 py-4">{movie.rating?.toFixed(1) || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    movie.status === 'now_showing' ? 'bg-green-100 text-green-800' :
                    movie.status === 'coming_soon' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {movie.status === 'now_showing' ? 'Đang chiếu' : 
                     movie.status === 'coming_soon' ? 'Sắp chiếu' : 'Ngừng chiếu'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(movie.id)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovieManagement;