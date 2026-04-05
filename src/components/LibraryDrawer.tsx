"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Trash2, Music } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Favorite {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (song: { videoId: string; title: string; channel: string; thumbnail: string }) => void;
  userId: string | undefined;
}

export default function LibraryDrawer({ isOpen, onClose, onSelect, userId }: LibraryDrawerProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFavorites(data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchFavorites();
    }
  }, [isOpen, userId, fetchFavorites]);

  const removeFavorite = async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (!error) {
      setFavorites(favorites.filter(f => f.id !== id));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[101] glass-strong shadow-2xl p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">My Library</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mt-1">
                  {favorites.length} Saved Tracks
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-20">
                  <div className="w-8 h-8 rounded-full border-2 border-t-white animate-spin mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Loading Library...</p>
                </div>
              ) : favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-20 text-center">
                  <Music size={48} className="mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest leading-loose">
                    Your library is empty.<br/>Heart some tracks to save them here.
                  </p>
                </div>
              ) : (
                favorites.map((song) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative flex items-center gap-4 p-3 rounded-2xl glass hover:glow-border-hover transition-all cursor-pointer"
                    onClick={() => {
                        onSelect({
                            videoId: song.video_id,
                            title: song.title,
                            channel: song.channel,
                            thumbnail: song.thumbnail
                        });
                        onClose();
                    }}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={song.thumbnail} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={20} fill="white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm line-clamp-1 group-hover:text-[#b4ffdc] transition-colors">{song.title}</h4>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">{song.channel}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(song.id);
                      }}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
