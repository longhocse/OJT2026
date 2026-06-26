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
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-gray-800 bg-gray-950 text-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      {/* Logo */}
      <div className="hidden border-b border-gray-800 p-6 lg:block">
        <h1 className="text-2xl font-bold text-yellow-500">CINEMA NOIR</h1>

        <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
      </div>

      {/* Menu */}
      <nav aria-label="Điều hướng quản trị" className="min-w-0 flex-1 overflow-x-auto p-2 lg:p-4">
        <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-yellow-500 text-black font-semibold"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="hidden border-t border-gray-800 p-4 lg:block">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
