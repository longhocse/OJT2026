import {
  LayoutDashboard,
  Film,
  Building2,
  DoorOpen,
  Users,
  LogOut,
  CalendarDays,
  Ticket,
  CreditCard,
  Tags,
  ScrollText,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearClientSession } from "../../services/authSession";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Movies",
      path: "/admin/movies",
      icon: Film,
    },
    {
      name: "Genres",
      path: "/admin/genres",
      icon: Tags,
    },
    {
      name: "Cinemas",
      path: "/admin/cinemas",
      icon: Building2,
    },
    {
      name: "Rooms",
      path: "/admin/rooms",
      icon: DoorOpen,
    },
    {
      name: "Shows",
      path: "/admin/shows",
      icon: CalendarDays,
    },
    {
      name: "Bookings",
      path: "/admin/bookings",
      icon: Ticket,
    },
    { name: "Payments", path: "/admin/payments", icon: CreditCard },
    {
      name: "Users",
      path: "/admin/users",
      icon: Users,
    },
    {
      name: "Audit Logs",
      path: "/admin/audit-logs",
      icon: ScrollText,
    },
  ];

  const handleLogout = () => {
    void clearClientSession();
    navigate("/login");
  };

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-white/5 bg-[#0B1120] text-slate-200 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-white/5">

      {/* Logo & Branding */}
      <div className="hidden border-b border-white/5 p-6 lg:block">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
            CINEMA NOIR
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5 inline-block">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav aria-label="Điều hướng quản trị" className="min-w-0 flex-1 overflow-x-auto p-2 lg:p-4 relative">
        <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-900/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:border hover:border-white/5"
                  }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-200"}`}
                />
                <span className={`font-medium ${isActive ? "font-semibold" : "font-normal"}`}>
                  {item.name}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Button (Desktop) */}
      <div className="hidden border-t border-white/5 p-4 lg:block">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-colors">
            <LogOut size={16} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-medium group-hover:translate-x-1 transition-transform">Logout</span>
        </button>
      </div>
    </aside>
  );
}