import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { queryKeys } from "../services/queryKeys";
import SafeImage from "../components/common/SafeImage";
import ApiErrorState from "../components/common/ApiErrorState";
import MovieCard from "../components/common/MovieCard";

const HomePage = () => {
  // Lấy danh sách phim đang chiếu
  const nowParams = { status: "now_showing", page: 1, limit: 8, sortBy: "release_date" };
  const nowShowing = useQuery({
    queryKey: queryKeys.movies.list(nowParams),
    queryFn: () => movieService.getMovies(nowParams),
  });

  const featuredMovie = nowShowing.data?.data?.[0] || null;

  return (
    <main className="bg-[#FAFAFA] text-[#2D2D2D] min-h-screen">

      {/* 1. HERO SECTION (Màu nền xanh tím nhạt như ảnh 1) */}
      <section className="relative min-h-[70vh] bg-gradient-to-br from-[#EBF1FF] via-[#DCE5FF] to-[#C7D2FE] flex items-center overflow-hidden">
        {/* Background trang trí vòng tròn mờ (như ảnh 3D) */}
        <div className="absolute right-[-10%] top-[-20%] w-[600px] h-[600px] bg-gradient-to-tr from-[#FCA5A5] to-[#FCD34D] rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
        <div className="absolute left-[-10%] bottom-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-[#FDE047] to-[#FCA5A5] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-16 md:px-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-5">
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#2b2d42] leading-tight tracking-tight">
              Trải nghiệm <br /> rạp phim <span className="text-[#DC2626]">đỉnh cao</span>
            </h1>
            <p className="text-xl text-[#2b2d42]/80 font-medium max-w-md">
              Đặt vé ngay hôm nay, tận hưởng công nghệ IMAX và âm thanh sống động.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                to={featuredMovie ? `/movie/${featuredMovie.id}` : "/movies"}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-8 py-3.5 rounded-xl transition shadow-md shadow-[#DC2626]/30"
              >
                Đặt vé ngay
              </Link>
              <Link
                to="/movies"
                className="bg-white text-[#DC2626] border border-[#DC2626] font-bold px-8 py-3.5 rounded-xl hover:bg-[#FEF2F2] transition"
              >
                Xem lịch chiếu
              </Link>
            </div>
          </div>

          {/* Ảnh Poster minh họa bên phải (Placeholder) */}
          <div className="hidden md:flex justify-center items-center relative">
            <div className="w-[350px] h-[450px] md:w-[450px] md:h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-white transform rotate-3 hover:rotate-0 transition duration-500">
              {featuredMovie?.poster_url ? (
                <SafeImage src={featuredMovie.poster_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FCA5A5] to-[#FCD34D] flex items-center justify-center text-white font-bold text-2xl">Poster Phim</div>
              )}
            </div>
            {/* Khung poster phụ đằng sau */}
            <div className="absolute -z-10 w-[320px] h-[420px] md:w-[420px] md:h-[520px] bg-[#FDE047] rounded-3xl transform -rotate-6 translate-y-4 translate-x-8"></div>
          </div>
        </div>
      </section>

      {/* 2. DANH SÁCH PHIM (Nền trắng kem như ảnh 2, 5) */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 md:px-8">
        <div className="flex flex-col md:flex-row items-end justify-between mb-10 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2b2d42] mb-2">Phim đang chiếu</h2>
            <p className="text-gray-500">Những tựa phim hấp dẫn nhất tại rạp</p>
          </div>
          <Link to="/movies" className="mt-4 md:mt-0 text-[#DC2626] font-semibold hover:text-[#B91C1C] transition underline-offset-4 hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {nowShowing.isPending ? (
          <div className="py-20 text-center text-gray-500 text-lg">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626] mb-4"></div>
            <p>Đang tải danh sách phim...</p>
          </div>
        ) : nowShowing.isError ? (
          <ApiErrorState message="Không thể tải danh sách phim." onRetry={() => nowShowing.refetch()} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {nowShowing.data?.data?.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* 3. GIỚI THIỆU VỀ RẠP (Nền xám nhạt, layout như ảnh 5) */}
      <section className="bg-[#F3F4F6] py-20">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-5">
            <span className="text-[#DC2626] font-bold uppercase tracking-widest text-sm">Giới thiệu</span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#2b2d42] leading-tight">
              Hệ thống rạp phim <br /> hiện đại bậc nhất
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              Chúng tôi mang đến trải nghiệm điện ảnh tuyệt vời với dãy ghế cao cấp, màn hình siêu nét và âm thanh sống động. Không gian rạp được thiết kế tối ưu để bạn có những giây phút thư giãn trọn vẹn.
            </p>
            <div>
              <button className="bg-[#DC2626] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#B91C1C] transition shadow-md">
                Tìm hiểu thêm
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden aspect-video border border-gray-200">
              <SafeImage
                src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Icon 3D trang trí (Placeholder) */}
            <div className="absolute -bottom-6 -left-6 w-20 h-20 md:w-24 md:h-24 bg-[#FDE047] rounded-full flex items-center justify-center text-[#2b2d42] text-2xl font-bold shadow-lg border-4 border-white">
              <span className="text-sm">🎬</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIÊN HỆ & ĐĂNG KÝ (Màu nền đỏ cam, form trắng như ảnh 4) */}
      <section className="bg-[#DC2626] text-white relative overflow-hidden">
        {/* Background pattern mờ */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#B91C1C] to-[#F97316] opacity-90"></div>

        <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-20 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Cùng những bộ phim xuất sắc nhất</h2>
            <h2 className="text-4xl font-bold">tận hưởng thế giới điện ảnh</h2>
            <button className="mt-6 bg-[#FDE047] text-[#2b2d42] font-bold px-6 py-2.5 rounded-lg hover:bg-[#FEF08A] transition">
              Tuyển dụng nhân sự
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
            {/* Form Liên hệ trái (Nền trắng, chữ đen) */}
            <div className="bg-white text-[#2b2d42] p-8 rounded-2xl shadow-xl">
              <h3 className="text-2xl font-bold mb-2">Liên hệ đặt vé</h3>
              <p className="text-gray-500 text-sm mb-6">Để lại thông tin để chúng tôi liên hệ tư vấn.</p>

              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tên *</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Họ *</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email *</label>
                  <input type="email" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Lời nhắn</label>
                  <textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"></textarea>
                </div>
                <button type="button" className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-3 rounded-lg transition shadow-md shadow-[#DC2626]/30">
                  Gửi
                </button>
              </form>
            </div>

            {/* Form Đăng ký phải (Nền đỏ cam, chữ vàng như ảnh 4) */}
            <div className="flex items-end h-full pb-4">
              <div className="bg-gradient-to-br from-[#EA580C] to-[#DC2626] p-8 rounded-2xl shadow-xl w-full text-white border border-white/20">
                <h3 className="text-xl font-bold mb-1">Đăng ký nhận tin</h3>
                <p className="text-sm opacity-90 mb-4">Nhận các ưu đãi đặt vé mới nhất.</p>
                <div className="mt-2">
                  <label className="block text-xs font-bold mb-1">Email *</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="email" className="flex-1 border border-white/30 bg-white/10 rounded-lg p-2.5 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FDE047]" placeholder="Email của bạn" />
                    <button type="button" className="bg-[#FDE047] text-[#2b2d42] font-bold px-4 py-2.5 rounded-lg hover:bg-[#FEF08A] transition whitespace-nowrap">
                      Đăng ký
                    </button>
                  </div>
                  <p className="mt-2 text-xs opacity-80">Cảm ơn bạn đã đăng ký!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;