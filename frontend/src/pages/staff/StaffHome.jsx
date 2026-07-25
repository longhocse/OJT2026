import { Building2, CircleUserRound, ShieldCheck } from "lucide-react";
import { useSelector } from "react-redux";

const ROLE_LABELS = {
  manager: "Quản lý chi nhánh",
  cashier: "Thu ngân",
  ticket_checker: "Nhân viên soát vé",
};

export default function StaffHome() {
  const user = useSelector((state) => state.auth.user);
  const assignments = (user?.theaterAssignments || []).filter((item) => item.is_active && item.theater);
  return (
    <main className="min-h-full bg-[#0B1120] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-white/5 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">{ROLE_LABELS[user?.role] || user?.role}</p>
          <h1 className="mt-2 text-3xl font-extrabold">Xin chào, {user?.name}</h1>
          <p className="mt-2 text-slate-400">Khu vực làm việc dành riêng cho tài khoản của bạn.</p>
        </div>
        {assignments.length ? (
          <section className="grid gap-5 md:grid-cols-2">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-500/15 p-3 text-blue-400"><Building2 size={28} /></div>
                  <div><p className="text-xs uppercase tracking-wider text-slate-500">Cơ sở làm việc</p><h2 className="mt-1 text-xl font-bold">{assignment.theater.name}</h2><p className="mt-2 text-sm text-slate-400">{[assignment.theater.address, assignment.theater.city].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ"}</p></div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300">Tài khoản chưa được gán cơ sở. Hãy liên hệ quản trị viên.</div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard icon={CircleUserRound} label="Tài khoản" value={user?.email} />
          <InfoCard icon={ShieldCheck} label="Vai trò" value={ROLE_LABELS[user?.role] || user?.role} />
        </div>
      </div>
    </main>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/70 p-5"><Icon className="text-cyan-400" /><div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-200">{value}</p></div></div>;
}
