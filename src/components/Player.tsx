"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import YouTube, { YouTubePlayer, YouTubeEvent } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Music,
  Heart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Song {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface PlayerProps {
  song: Song;
  onPlaying: (playing: boolean) => void;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Player({ song, onPlaying, onEnded }: PlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const checkIfFavorite = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !song) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", song.videoId)
      .single();

    setIsFavorite(!!data);
  }, [song]);

  useEffect(() => {
    if (song) {
      checkIfFavorite();
    }
  }, [song, checkIfFavorite]);

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Logic to show auth modal could be here, but for now just return
      return;
    }

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", song.videoId);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        video_id: song.videoId,
        title: song.title,
        channel: song.channel,
        thumbnail: song.thumbnail,
      });
      setIsFavorite(true);
    }
  };

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
    },
  };

  const startProgressTimer = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(async () => {
      if (!playerRef.current) return;
      try {
        const t = await playerRef.current.getCurrentTime();
        const d = await playerRef.current.getDuration();
        setCurrentTime(t || 0);
        setDuration(d || 0);
      } catch {
        // Ignore
      }
    }, 500);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressTimer();
  }, [stopProgressTimer]);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsReady(true);
    playerRef.current.setVolume(volume);
    const d = playerRef.current.getDuration();
    if (d) setDuration(d);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    onPlaying(true);
    startProgressTimer();
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPlaying(false);
    stopProgressTimer();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onPlaying(false);
    stopProgressTimer();
    setCurrentTime(0);
    onEnded?.();
  };

  const handleError = () => {
    setIsPlaying(false);
    onPlaying(false);
    stopProgressTimer();
  };

  const togglePlay = async () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      await playerRef.current.pauseVideo();
    } else {
      await playerRef.current.playVideo();
    }
  };

  const toggleMute = async () => {
    if (!playerRef.current) return;
    if (isMuted) {
      await playerRef.current.unMute();
      await playerRef.current.setVolume(volume);
    } else {
      await playerRef.current.mute();
    }
    setIsMuted((m: boolean) => !m);
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (!playerRef.current) return;
    await playerRef.current.setVolume(val);
    if (val === 0) {
      await playerRef.current.mute();
      setIsMuted(true);
    } else {
      await playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (!playerRef.current) return;
    await playerRef.current.seekTo(val, true);
  };

  const skip = async (delta: number) => {
    if (!playerRef.current) return;
    const t = await playerRef.current.getCurrentTime();
    await playerRef.current.seekTo(Math.max(0, t + delta), true);
  };

  const cleanTitle = (t: string) =>
    t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Hidden YouTube player */}
      <div className="absolute overflow-hidden" style={{ width: 0, height: 0 }}>
        <YouTube
          videoId={song.videoId}
          opts={opts}
          onReady={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnd={handleEnded}
          onError={handleError}
        />
      </div>

      {/* Song info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center space-y-2"
      >
        <h2
          className="font-bold text-2xl md:text-3xl tracking-tight leading-tight line-clamp-1 px-4 text-glow"
          style={{ color: "var(--text-primary)" }}
        >
          {cleanTitle(song.title)}
        </h2>
        <p className="text-sm font-medium tracking-wide uppercase opacity-50" style={{ color: "var(--text-secondary)" }}>
          {cleanTitle(song.channel)}
        </p>
      </motion.div>

      {/* Progress bar - Thinner and more elegant */}
      <div className="space-y-2 px-2 mt-4">
        <div className="relative group h-6 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full relative z-10"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.8) ${progress}%, rgba(255,255,255,0.05) ${progress}%)`,
            }}
            aria-label="Seek"
          />
        </div>
        <div className="flex justify-between px-1">
          <span className="text-[10px] font-bold tabular-nums tracking-widest opacity-40 uppercase">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] font-bold tabular-nums tracking-widest opacity-40 uppercase">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls - Iconic and Bold */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <motion.button
          whileHover={{ scale: 1.2, color: "#fff" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => skip(-10)}
          className="p-3 rounded-full transition-all"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Skip back 10 seconds"
        >
          <SkipBack size={20} strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="w-20 h-20 rounded-full glass-premium flex items-center justify-center transition-all group relative"
          style={{
            boxShadow: isPlaying
              ? "0 0 50px rgba(180,255,220,0.2), inset 0 0 20px rgba(255,255,255,0.05)"
              : "0 10px 30px rgba(0,0,0,0.3)",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
          id="play-pause-btn"
        >
          <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/20 transition-colors" />
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Pause size={32} fill="currentColor" strokeWidth={0} />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: -45 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Play size={32} fill="currentColor" strokeWidth={0} style={{ marginLeft: 4 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.2, color: "#fff" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => skip(10)}
          className="p-3 rounded-full transition-all"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Skip forward 10 seconds"
        >
          <SkipForward size={20} strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.2, color: isFavorite ? "#ff4081" : "#fff" }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleFavorite}
          className="p-3 rounded-full transition-all relative"
          style={{ color: isFavorite ? "#ff4081" : "var(--text-secondary)" }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
          {isFavorite && (
              <motion.div 
                layoutId="heart-glow"
                className="absolute inset-0 blur-lg bg-pink-500/20 rounded-full"
              />
          )}
        </motion.button>
      </div>

      {/* Volume - Simplified */}
      <div className="flex items-center gap-4 px-6 mt-6 group">
        <button
          onClick={toggleMute}
          className="shrink-0 transition-colors opacity-40 group-hover:opacity-100"
          style={{ color: "var(--text-primary)" }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full opacity-30 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.6) ${isMuted ? 0 : volume}%, rgba(255,255,255,0.1) ${isMuted ? 0 : volume}%)`,
            }}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
