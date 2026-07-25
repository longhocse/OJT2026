import {
  Building2, CalendarDays, CreditCard, DoorOpen, Film, Home, LogOut,
  Tags, Ticket, UserRound,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AdminBookings from "../pages/admin/AdminBookings";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminGenres from "../pages/admin/AdminGenres";
import AdminMovies from "../pages/admin/AdminMovies";
import AdminPayments from "../pages/admin/AdminPayments";
import AdminRoomForm from "../pages/admin/AdminRoomForm";
import AdminRooms from "../pages/admin/AdminRooms";
import AdminShowForm from "../pages/admin/AdminShowForm";
import AdminShows from "../pages/admin/AdminShows";
import CheckerPage from "../pages/staff/CheckerPage";
import CashierBookingPage from "../pages/staff/CashierBookingPage";
import CashierHistoryPage from "../pages/staff/CashierHistoryPage";
import { clearClientSession } from "../services/authSession";
import { roleHomePath } from "../utils/roles";

const LABELS = { manager: "Quản lý chi nhánh", cashier: "Thu ngân", ticket_checker: "Soát vé" };
const managerMenu = [
  ["Dashboard", "", Home], ["Movies", "/movies", Film], ["Genres", "/genres", Tags],
  ["Rooms", "/rooms", DoorOpen], ["Shows", "/shows", CalendarDays],
  ["Bookings", "/bookings", Ticket], ["Payments", "/payments", CreditCard],
];
const cashierMenu = [["Bán vé", "", Ticket], ["Lịch sử booking", "/history", CalendarDays]];

export default function StaffLayout() {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const home = roleHomePath(user?.role);
  const assignments = (user?.theaterAssignments || []).filter((item) => item.is_active && item.theater);
  const branchNames = assignments.map((item) => item.theater.name);
  const menu = user?.role === "manager" ? managerMenu : user?.role === "cashier" ? cashierMenu : [["Tổng quan", "", Home]];
  const logout = () => { void clearClientSession(); navigate("/login", { replace: true }); };
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1120] lg:flex-row">
      <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-col border-b border-white/5 bg-[#0B1120] text-slate-200 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="hidden border-b border-white/5 p-6 lg:block"><h1 className="bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">CINEMA NOIR</h1><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{LABELS[user?.role]}</p></div>
        <div className="border-b border-white/5 p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-500/15 p-2 text-blue-400"><Building2 size={20} /></div><div className="min-w-0"><p className="text-xs text-slate-500">Cơ sở</p><p className="truncate text-sm font-semibold">{branchNames.join(", ") || "Chưa được phân công"}</p></div></div></div>
        <nav className="min-w-0 flex-1 overflow-x-auto p-3 lg:overflow-y-auto">
          <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-1">
            {menu.map(([label, suffix, Icon]) => {
              const path = `${home}${suffix}`;
              const active = suffix ? location.pathname.startsWith(path) : location.pathname === home;
              return <Link key={path} to={path} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${active ? "border-blue-500/30 bg-blue-600/20 font-semibold text-blue-400" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}><Icon size={18} />{label}</Link>;
            })}
          </div>
        </nav>
        <div className="border-t border-white/5 p-4"><div className="mb-3 flex items-center gap-2 px-2 text-sm text-slate-400"><UserRound size={17} /><span className="truncate">{user?.name}</span></div><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"><LogOut size={18} /> Đăng xuất</button></div>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="min-h-full overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-2xl">{user?.role === "manager" ? <ManagerRoutes home={home} assignment={assignments[0]} /> : user?.role === "cashier" ? <CashierRoutes home={home} /> : <Routes><Route index element={<CheckerPage />} /><Route path="*" element={<Navigate to={home} replace />} /></Routes>}</div></div>
    </div>
  );
}

function CashierRoutes({ home }) {
  return <Routes>
    <Route index element={<CashierBookingPage />} />
    <Route path="history" element={<CashierHistoryPage />} />
    <Route path="*" element={<Navigate to={home} replace />} />
  </Routes>;
}

function ManagerRoutes({ home, assignment }) {
  return <Routes>
    <Route index element={<AdminDashboard />} />
    <Route path="movies" element={<AdminMovies />} />
    <Route path="genres" element={<AdminGenres />} />
    <Route path="rooms" element={<ScopedRooms assignment={assignment} />} />
    <Route path="rooms/create" element={<AdminRoomForm />} />
    <Route path="rooms/edit/:id" element={<AdminRoomForm />} />
    <Route path="shows" element={<AdminShows />} />
    <Route path="shows/create" element={<AdminShowForm />} />
    <Route path="shows/edit/:id" element={<AdminShowForm />} />
    <Route path="bookings" element={<AdminBookings />} />
    <Route path="payments" element={<AdminPayments />} />
    <Route path="*" element={<Navigate to={home} replace />} />
  </Routes>;
}

function ScopedRooms({ assignment }) {
  const [searchParams] = useSearchParams();
  if (!assignment?.theater?.id) return <div role="alert" className="m-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300">Tài khoản manager chưa được gán cơ sở.</div>;
  if (searchParams.get("cinemaId") !== String(assignment.theater.id)) return <Navigate to={`/manager/rooms?cinemaId=${assignment.theater.id}`} replace />;
  return <AdminRooms />;
}
