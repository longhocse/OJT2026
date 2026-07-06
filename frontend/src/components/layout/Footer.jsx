import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="mt-auto border-t border-white/10 bg-surface-container-lowest">
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="flex flex-col justify-between gap-8 md:flex-row">
        <div className="max-w-md">
          <h2 className="mb-3 text-2xl font-bold text-primary">MovieTap</h2>
          <p className="text-sm text-on-surface-variant">
            Đặt vé, chọn ghế và quản lý lịch sử booking bằng dữ liệu trực tiếp từ hệ thống.
          </p>
        </div>
        <nav aria-label="Liên kết cuối trang">
          <ul className="flex flex-wrap gap-5 text-sm text-on-surface-variant">
            <li>
              <Link to="/movies?status=now_showing" className="hover:text-primary">
                Phim đang chiếu
              </Link>
            </li>
            <li>
              <Link to="/movies?status=coming_soon" className="hover:text-primary">
                Phim sắp chiếu
              </Link>
            </li>
            <li>
              <Link to="/my-bookings" className="hover:text-primary">
                Lịch sử booking
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-on-surface-variant">
        © {new Date().getFullYear()} MovieTap.
      </div>
    </div>
  </footer>
);

export default Footer;
