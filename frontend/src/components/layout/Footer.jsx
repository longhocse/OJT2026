import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="mt-auto bg-[#F5F0EB] border-t border-[#E6DFD9] text-[#3E3A39]">
    <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">

      {/* Main Footer Content (Giữ nguyên 2 cột) */}
      <div className="flex flex-col justify-between gap-8 md:flex-row mb-8">

        {/* Cột 1: Logo & Mô tả */}
        <div className="max-w-md">
          <Link to="/" className="mb-3 text-2xl font-extrabold text-[#3E3A39] inline-block hover:text-[#B8744C] transition-colors">
            MovieTap
          </Link>
          <p className="text-sm text-[#6B625A] leading-relaxed">
            Đặt vé, chọn ghế và quản lý lịch sử booking bằng dữ liệu trực tiếp từ hệ thống.
          </p>
        </div>

        {/* Cột 2: Liên kết cuối trang (Giữ nguyên Link) */}
        <nav aria-label="Liên kết cuối trang">
          <ul className="flex flex-wrap gap-5 text-sm text-[#6B625A] font-medium">
            <li>
              <Link to="/movies?status=now_showing" className="hover:text-[#B8744C] transition-colors">
                Phim đang chiếu
              </Link>
            </li>
            <li>
              <Link to="/movies?status=coming_soon" className="hover:text-[#B8744C] transition-colors">
                Phim sắp chiếu
              </Link>
            </li>
            <li>
              <Link to="/my-bookings" className="hover:text-[#B8744C] transition-colors">
                Lịch sử booking
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Bottom Bar - Bản quyền */}
      <div className="mt-8 pt-6 border-t border-[#E6DFD9] text-center text-sm text-[#6B625A]">
        © {new Date().getFullYear()} <span className="text-[#B8744C] font-semibold">MovieTap</span>.
      </div>

    </div>
  </footer>
);

export default Footer;