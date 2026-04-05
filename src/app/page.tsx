"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import Player from "@/components/Player";
import LyricsDisplay from "@/components/LyricsDisplay";
import AnimatedBackground from "@/components/AnimatedBackground";
import AuthModal from "@/components/AuthModal";
import LibraryDrawer from "@/components/LibraryDrawer";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { UserCircle, LogOut, Library } from "lucide-react";

// Lazy-load the heavy visualizer
const Visualizer = lazy(() => import("@/components/Visualizer"));

interface Song {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

export default function HomePage() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Track auth changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keyboard shortcut: Space to play/pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        // Click the play button
        const btn = document.getElementById("play-pause-btn");
        btn?.click();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const fetchLyrics = useCallback(async (song: Song) => {
    setLyrics(null);
    setLyricsLoading(true);
    try {
      // Extract likely artist from channel name
      const artist = song.channel
        .replace(/\s*VEVO\s*/gi, "")
        .replace(/\s*-\s*Topic\s*$/i, "")
        .trim();

      // Extract title by stripping common YouTube suffixes
      const title = song.title
        .replace(/\s*[(\[].{0,40}?[)\]]/g, "")
        .replace(/\bofficial\b|\baudio\b|\bvideo\b|\blyrics?\b|\bHQ\b/gi, "")
        .trim();

      const res = await fetch(
        `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
      );
      const data = await res.json();
      setLyrics(data.lyrics || null);
    } catch {
      setLyrics(null);
    } finally {
      setLyricsLoading(false);
    }
  }, []);

  const handleSongSelect = useCallback(
    (song: Song) => {
      setCurrentSong(song);
      setIsPlaying(false);
      setLyrics(null);
      fetchLyrics(song);
    },
    [fetchLyrics]
  );

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      {/* Dynamic Blurred Background Art */}
      <AnimatePresence>
        {currentSong && (
          <motion.div
            key={currentSong.videoId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-0 pointer-events-none"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${currentSong.thumbnail})`,
                filter: "blur(100px) saturate(150%)",
                transform: "scale(1.2)",
              }}
            />
            {/* Dark overlay to ensure contrast */}
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated canvas background */}
      <AnimatedBackground />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between px-8 py-6 md:px-12"
        >
          {/* Logo with layoutId */}
          <motion.div 
            layoutId="main-logo"
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentSong(null)}
          >
            <motion.div
              className="w-10 h-10 rounded-2xl glass flex items-center justify-center group-hover:glow-border-hover transition-all"
              animate={
                isPlaying
                  ? {
                      boxShadow: [
                        "0 0 0 1px rgba(180,255,220,0.1)",
                        "0 0 30px rgba(180,255,220,0.3)",
                        "0 0 0 1px rgba(180,255,220,0.1)",
                      ],
                    }
                  : {}
              }
              transition={
                isPlaying ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : {}
              }
            >
              <span
                className="text-base font-black tracking-tighter"
                style={{ color: isPlaying ? "var(--neon-accent)" : "white" }}
              >
                V
              </span>
            </motion.div>
            <span
              className="font-black text-xl tracking-tighter text-glow"
              style={{ letterSpacing: "-0.05em" }}
            >
              VPlay
            </span>
          </motion.div>

          {/* Header Controls */}
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {user ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <button 
                    onClick={() => setIsLibraryOpen(true)}
                    className="p-2 rounded-xl glass hover:glow-border-hover transition-all text-white/60 hover:text-white" 
                    title="My Library"
                  >
                    <Library size={20} />
                  </button>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="p-2 rounded-xl glass hover:glow-border-hover transition-all text-white/60 hover:text-red-400" 
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2 rounded-xl glass-premium text-sm font-bold tracking-tight hover:glow-border-hover transition-all"
                >
                  Sign In
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="hidden md:flex glass-premium px-4 py-2 rounded-full items-center gap-2.5"
                  style={{ border: "1px solid rgba(180,255,220,0.2)" }}
                >
                  <motion.span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--neon-accent)", boxShadow: "0 0 10px var(--neon-accent)" }}
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{ color: "var(--neon-accent)" }}
                  >
                    Now Playing
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />

        <LibraryDrawer
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={handleSongSelect}
          userId={user?.id}
        />

        {/* Main content */}
        <AnimatePresence mode="wait">
          {!currentSong ? (
            /* ── Hero / Search landing ── */
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col items-center justify-center px-6 gap-16 relative"
            >
              {/* Massive Hero text */}
              <div className="text-center relative">
                <motion.div
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 0.03, scale: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                >
                  <h1 className="text-[20vw] font-black tracking-tighter uppercase leading-none">
                    VPlay
                  </h1>
                </motion.div>

                <div className="space-y-4 relative z-10">
                  <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-7xl md:text-9xl font-black tracking-tighter"
                    style={{ letterSpacing: "-0.06em", lineHeight: 0.85 }}
                  >
                    <span className="text-white">Pure</span>
                    <br />
                    <span className="text-zinc-900 border-text-stroke" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.1)" }}>Sound</span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-base md:text-xl max-w-lg mx-auto leading-relaxed font-medium text-zinc-500"
                  >
                    Minimalist design for an immersive experience. <br />
                    No distractions. Just you and the music.
                  </motion.p>
                </div>
              </div>

              {/* Search bar with layoutId */}
              <motion.div
                layoutId="search-container"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="w-full max-w-2xl px-4"
              >
                <SearchBar onSelect={handleSongSelect} isPlayerOpen={false} />
              </motion.div>

              {/* Enhanced Keyboard hints */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] font-bold opacity-30"
              >
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded-lg glass border-none">/</kbd>
                  <span>Search</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 rounded-lg glass border-none">Space</kbd>
                  <span>Pause</span>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* ── Player layout ── */
            <motion.div
              key="player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col gap-10 px-6 pb-12 md:px-12 max-w-[1400px] mx-auto w-full"
            >
              {/* Search bar with layoutId (moved to top) */}
              <motion.div 
                layoutId="search-container"
                className="max-w-xl mx-auto w-full"
              >
                <SearchBar
                  onSelect={handleSongSelect}
                  isPlayerOpen={true}
                />
              </motion.div>

              {/* Grid Layout - More fluid and airy */}
              <div className="flex-1 layout-container">
                {/* Left panel — Player & Controls */}
                <motion.div
                  initial={{ opacity: 0, x: -40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-premium rounded-[3rem] p-10 flex flex-col gap-10 items-center justify-center relative overflow-hidden"
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] -mr-10 -mt-10" />
                  
                  <div className="w-full aspect-square flex items-center justify-center max-w-[320px]">
                    <Suspense fallback={<div className="w-full h-full rounded-full glass animate-pulse" />}>
                      <Visualizer isPlaying={isPlaying} />
                    </Suspense>
                  </div>

                  <div className="w-full">
                    <Player
                      song={currentSong}
                      onPlaying={handlePlayingChange}
                    />
                  </div>
                </motion.div>

                {/* Right panel — Lyrics */}
                <motion.div
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="glass rounded-[3rem] p-4 flex flex-col min-h-[500px] lg:min-h-0 relative overflow-hidden"
                >
                   {/* Decorative glow */}
                   <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/5 blur-[80px] -ml-10 -mb-10" />

                  <LyricsDisplay
                    lyrics={lyrics}
                    isLoading={lyricsLoading}
                    songTitle={currentSong.title}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="text-center pb-4 px-4">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.1)" }}>
            VPlay · Powered by YouTube &amp; lyrics.ovh
          </p>
        </footer>
      </div>

      {/* Ambient glow orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(180,255,220,0.03) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />
    </main>
  );
}
