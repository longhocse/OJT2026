import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

const HomePage = () => {
  const { data: movies, isLoading } = useQuery({
    queryKey: ["movies", "now_showing"],
    queryFn: async () => {
      const res = await api.get("/movies?status=now_showing&limit=6");
      return res.data.data;
    },
  });

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-background text-on-background">
      {/* Hero Section */}
      <section className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cinematic banner"
            className="w-full h-full object-cover object-center"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB26qpYDYg1t0EbxTR1MWACjZoKDw1ujqx1-FpP6xvYAPQCXs6BsOWFyDaLqsj_kJ9HatrhgjAXOzACPubs1JHhwuUE9OWqzJqnvrk9LJvW69I1tlXAZoy3CAqESQhIGXt5o5-x1MNSBPhgtBpadto_WM14AUB7au-CzczUR23uA988uH4RQe5xN_KIS5GpXftyJKtwxbzek3VYkkzlphM0M6bUMZ43kTWnzDFIHkOECGKIWl9eZVJzlrja9-hRsqVLbIeRpu5TT1c"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent md:w-2/3"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-end h-full px-4 md:px-8 pb-16 md:pb-24 max-w-[1440px] mx-auto">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-button text-sm text-secondary tracking-widest uppercase mb-4"
          >
            THE FUTURE IS FORGOTTEN
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="font-display-lg text-4xl md:text-[80px] leading-tight text-on-background mb-6 max-w-3xl drop-shadow-2xl"
          >
            THE LAST SHADOW
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex gap-4 items-center mb-8"
          >
            <span className="bg-surface-container/60 backdrop-blur-md px-3 py-1 rounded border border-white/10 font-label-sm text-xs text-on-surface">
              Sci-Fi
            </span>
            <span className="bg-surface-container/60 backdrop-blur-md px-3 py-1 rounded border border-white/10 font-label-sm text-xs text-on-surface">
              145m
            </span>
            <span className="bg-primary-container/20 px-3 py-1 rounded border border-primary-container font-label-sm text-xs text-primary">
              IMAX 3D
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex gap-4"
          >
            <Link
              to="/movies"
              className="bg-gradient-to-r from-primary-container to-[#B8860B] text-on-primary-container font-button text-sm px-8 py-4 rounded shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] transition-all duration-300 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              BOOK NOW
            </Link>
            <button className="bg-surface-container/50 backdrop-blur-md text-on-surface border border-white/10 font-button text-sm px-8 py-4 rounded hover:bg-surface-container transition-colors duration-300 flex items-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              TRAILER
            </button>
          </motion.div>
        </div>
      </section>

      {/* Movie Filters */}
      <section className="px-4 md:px-8 py-8 max-w-[1440px] mx-auto">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {["All", "Action", "Drama", "Sci-Fi", "Horror", "Animation"].map(
            (filter) => (
              <button
                key={filter}
                className={`px-6 py-2 rounded-full font-button text-sm whitespace-nowrap transition-colors ${filter === "All"
                  ? "bg-primary-container/10 border border-primary-container text-primary"
                  : "bg-surface-container hover:bg-surface-container-high border border-white/5 text-on-surface-variant hover:text-on-surface"
                  }`}
              >
                {filter}
              </button>
            )
          )}
        </div>
      </section>

      {/* Now Showing */}
      <section className="px-4 md:px-8 py-12 max-w-[1440px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <h2 className="font-headline-md text-2xl text-on-background relative inline-block">
            Now Showing
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-primary-container rounded-full"></span>
          </h2>
          <Link
            to="/movies"
            className="text-primary hover:text-primary-fixed transition-colors font-button text-sm flex items-center gap-1"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies?.slice(0, 3).map((movie, index) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[2/3] bg-surface-container-low shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
              >
                <img
                  src={movie.poster_url || "https://via.placeholder.com/300x450?text=Movie+Poster"}
                  alt={movie.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-surface-container/80 backdrop-blur-md px-3 py-1 rounded border border-secondary/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-secondary text-sm">star</span>
                  <span className="font-label-sm text-xs text-secondary">{movie.rating || "N/A"}</span>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6 bg-gradient-to-t from-background via-background/70 to-transparent">
                  <h3 className="font-headline-md text-xl text-on-background mb-2 drop-shadow-md">
                    {movie.title}
                  </h3>
                  <div className="flex gap-3 items-center mb-4 text-on-surface-variant font-label-sm text-xs">
                    <span>{movie.genre?.split("/")[0] || "Action"}</span>
                    <span className="w-1 h-1 rounded-full bg-white/30"></span>
                    <span>{movie.duration}m</span>
                  </div>
                  <Link
                    to={`/movie/${movie.id}`}
                    className="w-full bg-primary-container hover:bg-[#B8860B] text-on-primary-container font-button text-sm py-3 rounded transition-colors duration-300 text-center"
                  >
                    GET TICKETS
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Coming Soon Bento Layout */}
      <section className="px-4 md:px-8 py-16 max-w-[1440px] mx-auto">
        <h2 className="font-headline-md text-2xl text-on-background mb-8 relative inline-block">
          Coming Soon
          <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-surface-variant rounded-full"></span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
          <div className="md:col-span-2 relative rounded-xl overflow-hidden group cursor-pointer border border-white/5">
            <img
              alt="Coming soon movie"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCprIWS1hvA5O1_io1-c1J_fAGRDfRwSGI565IQEoGbufbe-6_a5_eEtuPaj01JhYYpLu-ad8SH53lChUQUCpeBaLs0EIYov62YcYjPrXaRYXUzzm9yW9BLVaGHn9Ygr6sW4grX_bslH_CkcZge-Nkt3htt10UmeKKP2eh3ZPCZBRLd5SIHNJaeAU_1DNV1odOcK51ucbDS2fWPZRElIP91wmmCzNX11R9trGb9FxUEHkOwKch54c5tDbg5ftILkbuFfHnpTATFngQ"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
            <div className="absolute top-6 left-6 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
              <span className="font-label-sm text-xs text-on-surface">Releases Dec 25</span>
            </div>
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="bg-surface/60 backdrop-blur-xl p-6 rounded-lg border border-white/10 max-w-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <span className="font-label-sm text-xs text-primary mb-2 block tracking-widest uppercase">
                  Animation / Adventure
                </span>
                <h3 className="font-headline-md text-xl text-on-background mb-3">Skyward Bound</h3>
                <p className="font-body-md text-sm text-on-surface-variant line-clamp-2 mb-4">
                  Join the epic adventure above the clouds where a young pilot discovers a hidden
                  world floating in the sky, protected by ancient guardians.
                </p>
                <button className="text-on-background border-b border-on-background font-button text-sm pb-1 hover:text-primary hover:border-primary transition-colors inline-flex items-center gap-1">
                  Set Reminder <span className="material-symbols-outlined text-sm">notifications_active</span>
                </button>
              </div>
              <div className="group-hover:opacity-0 transition-opacity duration-300 absolute bottom-8 left-8">
                <h3 className="font-headline-md text-xl text-on-background drop-shadow-lg">
                  Skyward Bound
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-high rounded-xl p-8 border border-white/5 flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-primary text-4xl mb-6">diamond</span>
              <h3 className="font-headline-md text-xl text-on-background mb-4">Exclusive Pre-Sales</h3>
              <p className="font-body-md text-sm text-on-surface-variant mb-6">
                VIP Lounge members get 48-hour early access to tickets for highly anticipated
                blockbusters.
              </p>
            </div>
            <button className="w-full bg-surface-container-lowest hover:bg-surface border border-white/10 text-on-surface font-button text-sm py-4 rounded transition-colors duration-300">
              UPGRADE TO VIP
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;