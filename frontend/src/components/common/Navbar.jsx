import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

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
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
          ? "bg-surface/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/40"
          : "bg-surface/80 backdrop-blur-xl border-b border-white/10"
        }`}
    >
      <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-[1440px] mx-auto">
        <Link
          to="/"
          className="font-display-lg text-2xl md:text-3xl font-bold text-primary-container tracking-tighter hover:scale-105 transition-transform duration-200"
        >
          CINEMA NOIR
        </Link>

        <div className="hidden md:flex gap-8 items-center">
  <Link to="/movies">Movies</Link>

  <Link to="/cinemas">
    Cinemas
  </Link>

  <Link to="/offers">
    Offers
  </Link>

  <Link to="/vip">
    VIP Lounge
  </Link>

  {user?.role === "admin" && (
    <Link
      to="/admin"
      className="text-on-surface-variant hover:text-on-surface transition-colors font-button text-sm uppercase tracking-widest hover:scale-105 duration-200"
    >
      Admin
    </Link>
  )}
</div>

        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full"></span>
          </button>

          {isAuthenticated ? (
  <div className="flex items-center gap-3">
    <span className="text-sm text-white">
      Welcome, {user?.name}
    </span>

    <div className="relative group">
      <button className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 overflow-hidden">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN3rcjvfqTAA6jRakxkuDkHJhIieebrazSHjLDu00TmvfvwHbITtXJqZ-FqOrr6-9NkDqNmO55yifAj6otIyJ3PG8jKiuiuCNEWAB1bVBGNh-QD-0BQRUcR_J8z1cOIdUrGZAf4ytp9KGxt4NAqH56xgf-YWVjcKg9njK-hNSLz0_2BIFKnTYOUZDCVKNwYE_nJPxxsJyA5AYvw22EsGdaQjpvMldFSg5plfA65dvx1K1uYng7faE_iBgPWio7RZtU6Hq0YE_geEI"
          alt="profile"
          className="w-full h-full object-cover"
        />
      </button>

      <div className="absolute right-0 mt-2 w-48 bg-surface-container-high rounded-lg shadow-lg border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">

        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm"
        >
          Logout
        </button>

      </div>
    </div>
  </div>
) : (
  <Link
    to="/login"
    className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg"
  >
    Login
  </Link>
)}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;