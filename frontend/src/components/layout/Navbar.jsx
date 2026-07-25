import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { clearClientSession } from "../../services/authSession";
import { authService } from "../../services/authService";
import { Ticket, User, LogOut, LayoutDashboard, Menu, X } from "lucide-react";

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (_error) {
      // Always clear the local session even when the server session is already gone.
    }
    await clearClientSession();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const isAdmin = user?.role === "admin";

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg shadow-gray-200/50"
          : "bg-white/80 backdrop-blur-md border-b border-transparent"
        }`}
    >
      <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl md:text-3xl font-extrabold text-[#2b2d42] tracking-tighter hover:scale-105 transition-transform duration-200 flex items-center gap-2"
        >
          <span className="bg-[#DC2626] text-white px-3 py-1 rounded-xl text-xl">🎬</span>
          MovieTap
        </Link>

        {/* Desktop Menu - Center */}
        <div className="hidden md:flex gap-1 items-center bg-[#F3F4F6] px-2 py-1 rounded-full shadow-inner">
          <Link
            to="/"
            className="px-5 py-2 text-[#2b2d42]/80 hover:text-[#2b2d42] hover:bg-white rounded-full transition-all font-medium text-sm"
          >
            Trang chủ
          </Link>
          <Link
            to="/movies"
            className="px-5 py-2 text-[#2b2d42]/80 hover:text-[#2b2d42] hover:bg-white rounded-full transition-all font-medium text-sm"
          >
            Phim
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-bookings"
              className="px-5 py-2 text-[#2b2d42]/80 hover:text-[#2b2d42] hover:bg-white rounded-full transition-all font-medium text-sm"
            >
              Vé của tôi
            </Link>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Admin Badge */}
              {isAdmin && (
                <div className="hidden md:flex items-center gap-1.5 bg-[#FDE047] text-[#2b2d42] px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-200 shadow-sm">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Admin
                </div>
              )}

              {/* User Dropdown */}
              <div className="relative group">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label="Mở menu tài khoản"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#DC2626] text-white font-bold border-2 border-white shadow-sm hover:ring-2 hover:ring-[#DC2626]/30 transition-all"
                >
                  {(user?.name || "U").trim().charAt(0).toUpperCase()}
                </button>

                <div
                  className="invisible absolute right-0 mt-3 w-52 rounded-2xl bg-white border border-gray-100 shadow-xl opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 origin-top-right"
                  role="menu"
                >
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-bold text-[#2b2d42] text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>

                  <div className="p-2 flex flex-col gap-1">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] rounded-xl text-sm flex items-center gap-3 text-[#2b2d42] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#DC2626]" /> Dashboard
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] rounded-xl text-sm flex items-center gap-3 text-[#2b2d42] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#DC2626]" /> Hồ sơ
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] rounded-xl text-sm flex items-center gap-3 text-[#2b2d42] transition-colors"
                    >
                      <Ticket className="w-4 h-4 text-[#DC2626]" /> Lịch sử đặt vé
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-xl text-sm flex items-center gap-3 text-red-500 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-6 py-2.5 bg-[#DC2626] text-white font-bold rounded-xl hover:bg-[#B91C1C] transition-colors shadow-md shadow-[#DC2626]/30 text-sm"
            >
              Đăng nhập
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            className="md:hidden text-[#2b2d42] hover:text-[#DC2626] ml-2 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (Full width dropdown for mobile) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden bg-white border-t border-gray-200 shadow-xl p-4"
        >
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Trang chủ
            </Link>
            <Link
              to="/movies"
              className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Phim
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/profile"
                  className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Hồ sơ
                </Link>
                <Link
                  to="/my-bookings"
                  className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Vé của tôi
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-2 mb-1">
                  <p className="text-[#DC2626] text-xs font-bold uppercase tracking-wider px-4 py-1">
                    Quản trị viên
                  </p>
                </div>
                <Link
                  to="/admin"
                  className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/movies"
                  className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Quản lý phim
                </Link>
                <Link
                  to="/admin/cinemas"
                  className="text-[#2b2d42] hover:bg-[#F3F4F6] px-4 py-3 rounded-xl transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Quản lý rạp
                </Link>
              </>
            )}

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="mt-2 text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl text-left font-medium transition-colors"
              >
                Đăng xuất
              </button>
            )}

            {!isAuthenticated && (
              <Link
                to="/login"
                className="mt-2 bg-[#DC2626] text-white font-bold px-4 py-3 rounded-xl text-center transition-colors shadow-md shadow-[#DC2626]/30"
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;