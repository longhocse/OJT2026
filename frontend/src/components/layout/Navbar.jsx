import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { 
  Home, Film, Ticket, User, 
  Settings, LogOut, LayoutDashboard,
  Menu, X
} from "lucide-react";

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
    setMobileMenuOpen(false);
  };

  const isAdmin = user?.role === "admin";

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/40"
          : "bg-surface/80 backdrop-blur-xl border-b border-white/10"
      }`}
    >
      <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-[1440px] mx-auto">
        {/* Logo */}
        <Link
          to="/"
          className="font-display-lg text-2xl md:text-3xl font-bold text-primary-container tracking-tighter hover:scale-105 transition-transform duration-200"
        >
          CINEMA NOIR
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center">
          <Link to="/" className="text-on-surface-variant hover:text-on-surface transition-colors font-button text-sm uppercase tracking-widest hover:scale-105 duration-200">
            Home
          </Link>
          <Link to="/movies" className="text-on-surface-variant hover:text-on-surface transition-colors font-button text-sm uppercase tracking-widest hover:scale-105 duration-200">
            Movies
          </Link>

          {isAuthenticated && (
            <Link to="/my-bookings" className="text-on-surface-variant hover:text-on-surface transition-colors font-button text-sm uppercase tracking-widest hover:scale-105 duration-200">
              My Bookings
            </Link>
          )}

          {/* Admin Menu - Chỉ hiển thị cho Admin */}
          {isAdmin && (
            <div className="relative group">
              <button className="text-primary hover:text-primary-fixed transition-colors font-button text-sm uppercase tracking-widest hover:scale-105 duration-200 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-high rounded-lg shadow-lg border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link to="/admin" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link to="/admin/movies" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <Film className="w-4 h-4" /> Quản lý phim
                </Link>
                <Link to="/admin/cinemas" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Quản lý rạp
                </Link>
                <Link to="/admin/rooms" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Quản lý phòng
                </Link>
                <Link to="/admin/bookings" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4" /> Quản lý đặt vé
                </Link>
                <Link to="/admin/users" className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2">
                  <User className="w-4 h-4" /> Quản lý người dùng
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white hidden md:block">
                {user?.name}
                {isAdmin && <span className="ml-2 text-xs text-primary">(Admin)</span>}
              </span>

              <div className="relative group">
                <button className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 overflow-hidden">
                  <img
                    src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random&size=40`}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="absolute right-0 mt-2 w-48 bg-surface-container-high rounded-lg shadow-lg border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/my-bookings"
                    className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4" /> My Bookings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm flex items-center gap-2 text-red-400"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg hover:bg-primary-container/80 transition-colors"
            >
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-on-surface-variant"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/movies" className="text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
              Movies
            </Link>
            {isAuthenticated && (
              <Link to="/my-bookings" className="text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                My Bookings
              </Link>
            )}
            {isAdmin && (
              <>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <p className="text-primary text-xs uppercase tracking-wider px-3 py-1">Admin Panel</p>
                </div>
                <Link to="/admin" className="text-primary hover:text-primary-fixed px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link to="/admin/movies" className="text-primary hover:text-primary-fixed px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  Quản lý phim
                </Link>
                <Link to="/admin/cinemas" className="text-primary hover:text-primary-fixed px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  Quản lý rạp
                </Link>
              </>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 px-3 py-2 rounded-lg text-left"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;