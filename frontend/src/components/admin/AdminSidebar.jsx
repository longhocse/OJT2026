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
import { useSelector } from "react-redux";
import { clearClientSession } from "../../services/authSession";
import {
  ADMIN_ROLE,
  CASHIER_ROLE,
  MANAGER_ROLE,
  TICKET_CHECKER_ROLE,
} from "../../utils/roles";

const ROLE_LABELS = {
  [ADMIN_ROLE]: "Admin toàn hệ thống",
  [MANAGER_ROLE]: "Manager chi nhánh",
  [CASHIER_ROLE]: "Thu ngân",
  [TICKET_CHECKER_ROLE]: "Soát vé",
};

const MENU_ITEMS = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard, roles: [ADMIN_ROLE, MANAGER_ROLE] },
  { name: "Movies", path: "/admin/movies", icon: Film, roles: [ADMIN_ROLE] },
  { name: "Genres", path: "/admin/genres", icon: Tags, roles: [ADMIN_ROLE] },
  { name: "Cinemas", path: "/admin/cinemas", icon: Building2, roles: [ADMIN_ROLE, MANAGER_ROLE] },
  { name: "Rooms", path: "/admin/rooms", icon: DoorOpen, roles: [ADMIN_ROLE, MANAGER_ROLE] },
  { name: "Shows", path: "/admin/shows", icon: CalendarDays, roles: [ADMIN_ROLE, MANAGER_ROLE] },
  {
    name: "Bookings",
    path: "/admin/bookings",
    icon: Ticket,
    roles: [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE],
  },
  {
    name: "Payments / Check-in",
    path: "/admin/payments",
    icon: CreditCard,
    roles: [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE],
  },
  { name: "Users", path: "/admin/users", icon: Users, roles: [ADMIN_ROLE] },
  { name: "Audit Logs", path: "/admin/audit-logs", icon: ScrollText, roles: [ADMIN_ROLE, MANAGER_ROLE] },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role;
  const assignments = user?.theaterAssignments || [];
  const menuItems = MENU_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    void clearClientSession();
    navigate("/login");
  };

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-gray-800 bg-gray-950 text-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="hidden border-b border-gray-800 p-6 lg:block">
        <h1 className="text-2xl font-bold text-yellow-500">MovieTap</h1>
        <p className="mt-1 text-sm text-gray-400">{ROLE_LABELS[role] || "Operation Panel"}</p>
        {assignments.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {assignments.map((item) => item.theater?.name).filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <nav aria-label="Điều hướng vận hành" className="min-w-0 flex-1 overflow-x-auto p-2 lg:p-4">
        <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

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

      <div className="hidden border-t border-gray-800 p-4 lg:block">
        <button
          type="button"
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
