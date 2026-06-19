// frontend/src/pages/admin/AdminMovies.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import api from '../../services/api';

const AdminMovies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: movies, isLoading } = useQuery({
    queryKey: ['admin', 'movies'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=100');
      return res.data.data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/movies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'movies']);
    }
  });

  const filteredMovies = movies?.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý phim</h1>
        <Link
          to="/admin/movies/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phim
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Tìm kiếm phim..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Movies Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Phim</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Thể loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Đánh giá</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center">Đang tải...</td>
              </tr>
            ) : filteredMovies?.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Chưa có phim nào</td>
              </tr>
            ) : (
              filteredMovies?.map((movie) => (
                <tr key={movie.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={movie.poster_url || 'https://via.placeholder.com/50x75?text=No+Poster'}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <span className="font-medium">{movie.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{movie.genre || 'N/A'}</td>
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
                      <Link
                        to={`/movie/${movie.id}`}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/admin/movies/edit/${movie.id}`}
                        className="p-2 bg-yellow-500/10 text-yellow-600 rounded-lg hover:bg-yellow-500/20 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xóa phim này?')) {
                            deleteMutation.mutate(movie.id);
                          }
                        }}
                        className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMovies;