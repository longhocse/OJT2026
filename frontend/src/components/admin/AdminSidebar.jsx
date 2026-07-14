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
import { useSelector } from "react-redux";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  // Menu dùng chung
  const commonMenu = [
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
    {
      name: "Payments",
      path: "/admin/payments",
      icon: CreditCard,
    },
  ];

  // Chỉ Admin mới thấy
  const adminMenu = [
    {
      name: "Cinemas",
      path: "/admin/cinemas",
      icon: Building2,
    },
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

  const menuItems = [
    ...commonMenu,
    ...(isAdmin ? adminMenu : []),
  ];

  const handleLogout = () => {
    void clearClientSession();
    navigate("/login");
  };

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-gray-800 bg-gray-950 text-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      {/* Logo */}
      <div className="hidden border-b border-gray-800 p-6 lg:block">
        <h1 className="text-2xl font-bold text-yellow-500">
          CINEMA NOIR
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          {isAdmin
            ? "Admin Panel"
            : isManager
            ? "Manager Panel"
            : "Control Panel"}
        </p>
      </div>

      {/* Menu */}
      <nav
        aria-label="Điều hướng quản trị"
        className="min-w-0 flex-1 overflow-x-auto p-2 lg:p-4"
      >
        <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                  isActive
                    ? "bg-yellow-500 font-semibold text-black"
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
          className="flex w-full items-center gap-3 rounded-lg bg-red-600 px-4 py-3 transition hover:bg-red-700"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}