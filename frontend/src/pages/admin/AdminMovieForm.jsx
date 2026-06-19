// frontend/src/pages/admin/AdminMovieForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';

const AdminMovieForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    duration: '',
    rating: '',
    poster_url: '',
    trailer_url: '',
    release_date: '',
    status: 'now_showing'
  });

  // Fetch movie if editing
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.get(`/movies/${id}`).then(res => res.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (movie) {
      setFormData({
        title: movie.title || '',
        description: movie.description || '',
        genre: movie.genre || '',
        duration: movie.duration || '',
        rating: movie.rating || '',
        poster_url: movie.poster_url || '',
        trailer_url: movie.trailer_url || '',
        release_date: movie.release_date ? movie.release_date.split('T')[0] : '',
        status: movie.status || 'now_showing'
      });
    }
  }, [movie]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) {
        return api.put(`/movies/${id}`, data);
      }
      return api.post('/movies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'movies']);
      navigate('/admin/movies');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      duration: parseInt(formData.duration),
      rating: parseFloat(formData.rating) || 0,
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading && isEdit) {
    return <div className="p-6 text-center">Đang tải...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/movies')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEdit ? 'Sửa phim' : 'Thêm phim mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Tên phim *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thể loại</label>
            <input
              type="text"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              placeholder="Ví dụ: Hành động, Khoa học viễn tưởng"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thời lượng (phút) *</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Đánh giá</label>
            <input
              type="number"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Poster</label>
            <input
              type="text"
              name="poster_url"
              value={formData.poster_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Trailer</label>
            <input
              type="text"
              name="trailer_url"
              value={formData.trailer_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ngày phát hành</label>
            <input
              type="date"
              name="release_date"
              value={formData.release_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="now_showing">Đang chiếu</option>
              <option value="coming_soon">Sắp chiếu</option>
              <option value="ended">Đã kết thúc</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/admin/movies')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Đang lưu...' : 'Lưu phim'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminMovieForm;