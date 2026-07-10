import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Film, LayoutDashboard, LogOut, Menu, Ticket, User, X } from "lucide-react";
import { clearClientSession } from "../../services/authSession";
import { authService } from "../../services/authService";
import { ADMIN_ROLE, isOperationRole, roleHomePath } from "../../utils/roles";

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
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

  const isAdmin = user?.role === ADMIN_ROLE;
  const canOperate = isOperationRole(user?.role);
  const operationHome = roleHomePath(user?.role);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          : "border-b border-white/10 bg-surface/80 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-8">
        <Link
          to="/"
          className="font-display-lg text-2xl font-bold tracking-tighter text-primary-container transition-transform duration-200 hover:scale-105 md:text-3xl"
        >
          MovieTap
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/movies">Movies</NavLink>
          {isAuthenticated && <NavLink to="/my-bookings">My Bookings</NavLink>}
          {canOperate && (
            <div className="relative group">
              <button
                type="button"
                aria-haspopup="menu"
                className="font-button flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm uppercase tracking-widest text-primary transition-colors duration-200 hover:scale-105 hover:text-primary-fixed"
              >
                <LayoutDashboard className="h-4 w-4" />
                {isAdmin ? "Admin" : "Vận hành"}
              </button>
              <div
                className="invisible absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-surface-container-high opacity-0 shadow-lg transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                role="menu"
              >
                <DropLink to={operationHome} icon={LayoutDashboard}>
                  Khu vận hành
                </DropLink>
                {isAdmin && (
                  <>
                    <DropLink to="/admin/movies" icon={Film}>
                      Quản lý phim
                    </DropLink>
                    <DropLink to="/admin/users" icon={User}>
                      Quản lý người dùng
                    </DropLink>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-white md:block">
                {user?.name}
                {canOperate && (
                  <span className="ml-2 text-xs text-primary">({user?.role})</span>
                )}
              </span>

              <div className="relative group">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label="Mở menu tài khoản"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-surface-container-high font-semibold uppercase"
                >
                  {(user?.name || "U").trim().charAt(0)}
                </button>

                <div
                  className="invisible absolute right-0 mt-2 w-52 rounded-lg border border-white/10 bg-surface-container-high opacity-0 shadow-lg transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                  role="menu"
                >
                  {canOperate && (
                    <DropLink to={operationHome} icon={LayoutDashboard}>
                      Khu vận hành
                    </DropLink>
                  )}
                  <DropLink to="/profile" icon={User}>
                    Hồ sơ
                  </DropLink>
                  <DropLink to="/my-bookings" icon={Ticket}>
                    My Bookings
                  </DropLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-primary-container px-4 py-2 text-on-primary-container transition-colors hover:bg-primary-container/80"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            className="text-on-surface-variant md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-white/10 bg-surface/95 p-4 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-3">
            <MobileLink to="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </MobileLink>
            <MobileLink to="/movies" onClick={() => setMobileMenuOpen(false)}>
              Movies
            </MobileLink>
            {isAuthenticated && (
              <>
                <MobileLink to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  Hồ sơ
                </MobileLink>
                <MobileLink to="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                  My Bookings
                </MobileLink>
              </>
            )}
            {canOperate && (
              <>
                <div className="mt-2 border-t border-white/10 pt-2">
                  <p className="px-3 py-1 text-xs uppercase tracking-wider text-primary">
                    Khu vận hành
                  </p>
                </div>
                <MobileLink to={operationHome} onClick={() => setMobileMenuOpen(false)}>
                  Dashboard vận hành
                </MobileLink>
              </>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-left text-red-400 hover:text-red-300"
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

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="font-button text-sm uppercase tracking-widest text-on-surface-variant transition-colors duration-200 hover:scale-105 hover:text-on-surface"
  >
    {children}
  </Link>
);

const DropLink = ({ to, icon: Icon, children }) => (
  <Link
    to={to}
    className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm hover:bg-white/10"
  >
    <Icon className="h-4 w-4" /> {children}
  </Link>
);

const MobileLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    className="rounded-lg px-3 py-2 text-on-surface-variant hover:text-on-surface"
    onClick={onClick}
  >
    {children}
  </Link>
);

export default Navbar;
