// frontend/src/pages/admin/AdminRoomForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

const AdminRoomForm = () => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Tính năng đang phát triển!');
    navigate('/admin/rooms');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/rooms')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Thêm phòng chiếu</h1>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-lg text-center">
        <p className="text-gray-500">Tính năng đang phát triển!</p>
        <button
          onClick={() => navigate('/admin/rooms')}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};

export default AdminRoomForm;