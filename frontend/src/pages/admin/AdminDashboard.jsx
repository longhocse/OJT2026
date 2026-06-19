// frontend/src/pages/admin/AdminDashboard.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Film, Users, Ticket, Theater, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';

const AdminDashboard = () => {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [movies, bookings, users] = await Promise.all([
        api.get('/movies?limit=100'),
        api.get('/bookings/admin/stats').catch(() => ({ data: { total: 0 } })),
        api.get('/admin/users/stats').catch(() => ({ data: { total: 0 } })),
      ]);
      return {
        totalMovies: movies.data.data?.length || 0,
        totalBookings: bookings.data?.total || 0,
        totalUsers: users.data?.total || 0,
      };
    }
  });

  const statsCards = [
    { title: 'Tổng phim', value: stats?.totalMovies || 0, icon: Film, color: 'bg-blue-500' },
    { title: 'Tổng đặt vé', value: stats?.totalBookings || 0, icon: Ticket, color: 'bg-green-500' },
    { title: 'Tổng người dùng', value: stats?.totalUsers || 0, icon: Users, color: 'bg-purple-500' },
    { title: 'Tổng rạp', value: 3, icon: Theater, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          Welcome back, Admin!
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Quản lý phim</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Thêm, sửa, xóa phim và quản lý thông tin</p>
          <Link
            to="/admin/movies"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Film className="w-4 h-4" />
            Quản lý phim
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Quản lý rạp</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Thêm, sửa, xóa rạp và phòng chiếu</p>
          <Link
            to="/admin/cinemas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Theater className="w-4 h-4" />
            Quản lý rạp
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Quản lý đặt vé</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Xem và quản lý tất cả đặt vé</p>
          <Link
            to="/admin/bookings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Quản lý đặt vé
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Quản lý người dùng</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Xem và quản lý tất cả người dùng</p>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Quản lý người dùng
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;