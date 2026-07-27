import {
  LayoutDashboard, Film, Building2, DoorOpen, Users, LogOut,
  CalendarDays, Ticket, CreditCard, Tags, ScrollText, Volume2, VolumeX,
  SkipBack, SkipForward, Play, Pause, Repeat2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearClientSession } from "../../services/authSession";

const menuItems = [
  ["Dashboard", "/admin", LayoutDashboard], ["Movies", "/admin/movies", Film],
  ["Genres", "/admin/genres", Tags], ["Cinemas", "/admin/cinemas", Building2],
  ["Rooms", "/admin/rooms", DoorOpen], ["Shows", "/admin/shows", CalendarDays],
  ["Bookings", "/admin/bookings", Ticket], ["Payments", "/admin/payments", CreditCard],
  ["Users", "/admin/users", Users], ["Audit Logs", "/admin/audit-logs", ScrollText],
];

const ADMIN_PLAYLIST = [
  { title: "Chill Mùa Hạ", src: "/audio/chill.mp3" },
  { title: "Rap", src: "/audio/rap.mp3" },
  { title: "Nhạc miền tây", src: "/audio/mientay.mp3" },
];
const MUSIC_STATE_KEY = "adminBackgroundMusic";
const MUSIC_TRACK_KEY = "adminBackgroundMusicTrack";
const MUSIC_REPEAT_KEY = "adminBackgroundMusicRepeat";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(
    () => window.sessionStorage.getItem(MUSIC_STATE_KEY) === "on",
  );
  const [trackIndex, setTrackIndex] = useState(() => {
    const saved = Number(window.sessionStorage.getItem(MUSIC_TRACK_KEY));
    return Number.isInteger(saved) && saved >= 0 && saved < ADMIN_PLAYLIST.length ? saved : 0;
  });
  const [repeatTrack, setRepeatTrack] = useState(
    () => window.sessionStorage.getItem(MUSIC_REPEAT_KEY) === "on",
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.28;
    if (musicEnabled) {
      audio.play().catch(() => {
        // Browser autoplay rules may require the administrator to press the button again.
      });
    } else {
      audio.pause();
    }
  }, [musicEnabled, trackIndex]);

  useEffect(() => {
    window.sessionStorage.setItem(MUSIC_TRACK_KEY, String(trackIndex));
  }, [trackIndex]);

  useEffect(() => {
    if (repeatTrack) window.sessionStorage.setItem(MUSIC_REPEAT_KEY, "on");
    else window.sessionStorage.removeItem(MUSIC_REPEAT_KEY);
  }, [repeatTrack]);

  const toggleMusic = () => {
    setMusicEnabled((enabled) => {
      const next = !enabled;
      if (next) window.sessionStorage.setItem(MUSIC_STATE_KEY, "on");
      else window.sessionStorage.removeItem(MUSIC_STATE_KEY);
      return next;
    });
  };

  const changeTrack = (direction) => {
    setTrackIndex((current) => (current + direction + ADMIN_PLAYLIST.length) % ADMIN_PLAYLIST.length);
  };

  const handleEnded = () => {
    if (!repeatTrack) changeTrack(1);
  };

  const handleLogout = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    window.sessionStorage.removeItem(MUSIC_STATE_KEY);
    window.sessionStorage.removeItem(MUSIC_TRACK_KEY);
    window.sessionStorage.removeItem(MUSIC_REPEAT_KEY);
    void clearClientSession();
    navigate("/login");
  };

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-white/5 bg-[#0B1120] text-slate-200 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <audio ref={audioRef} src={ADMIN_PLAYLIST[trackIndex].src} loop={repeatTrack} onEnded={handleEnded} preload="metadata" />
      <section aria-label="Trình phát nhạc nền" className="fixed right-5 top-20 z-[100] w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-slate-600/80 bg-slate-900/95 p-3 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 px-1">
          {musicEnabled ? <Volume2 size={17} className="text-cyan-400" /> : <VolumeX size={17} className="text-slate-500" />}
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{ADMIN_PLAYLIST[trackIndex].title}</p><p className="text-[10px] text-slate-500">{trackIndex + 1}/{ADMIN_PLAYLIST.length} · Nhạc nền admin</p></div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => changeTrack(-1)} title="Bài trước" aria-label="Bài trước" className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"><SkipBack size={19} fill="currentColor" /></button>
          <button type="button" onClick={toggleMusic} title={musicEnabled ? "Tạm dừng" : "Phát nhạc"} aria-label={musicEnabled ? "Tạm dừng" : "Phát nhạc"} aria-pressed={musicEnabled} className={`flex h-10 w-10 items-center justify-center rounded-full transition ${musicEnabled ? "bg-cyan-400 text-slate-950" : "bg-blue-600 text-white hover:bg-blue-500"}`}>{musicEnabled ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}</button>
          <button type="button" onClick={() => setRepeatTrack((value) => !value)} title={repeatTrack ? "Tắt lặp lại bài" : "Lặp lại bài hiện tại"} aria-label={repeatTrack ? "Tắt lặp lại bài" : "Lặp lại bài hiện tại"} aria-pressed={repeatTrack} className={`rounded-full p-2 hover:bg-white/10 ${repeatTrack ? "text-cyan-400" : "text-slate-400"}`}><Repeat2 size={20} /></button>
          <button type="button" onClick={() => changeTrack(1)} title="Bài sau" aria-label="Bài sau" className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"><SkipForward size={19} fill="currentColor" /></button>
        </div>
      </section>
      <div className="hidden border-b border-white/5 p-6 lg:block">
        <div>
          <div>
            <h1 className="bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">CINEMA NOIR</h1>
            <p className="mt-1 inline-block rounded-full border border-white/5 bg-slate-900/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav aria-label="Điều hướng quản trị" className="min-w-0 flex-1 overflow-x-auto p-2 lg:p-4">
        <div className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-1.5">
          {menuItems.map(([name, path, Icon]) => {
            const active = path === "/admin" ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link key={path} to={path} className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${active ? "border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 font-semibold text-blue-400 shadow-lg shadow-blue-900/10" : "border-transparent text-slate-400 hover:border-white/5 hover:bg-white/5 hover:text-slate-200"}`}>
                <Icon size={18} className={active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-200"} />
                <span>{name}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="hidden border-t border-white/5 p-4 lg:block">
        <button type="button" onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"><LogOut size={18} /> Logout</button>
      </div>
    </aside>
  );
}
