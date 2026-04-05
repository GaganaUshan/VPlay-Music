"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LyricsDisplayProps {
  lyrics: string | null;
  isLoading: boolean;
  songTitle: string;
}

export default function LyricsDisplay({
  lyrics,
  isLoading,
  songTitle,
}: LyricsDisplayProps) {
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lines = useMemo(() => {
    if (!lyrics) return [];
    return lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [lyrics]);

  // Auto advance active line every ~3 seconds for illusion of line highlighting
  useEffect(() => {
    if (!lines.length) return;
    setActiveLineIndex(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setActiveLineIndex((prev) => {
        if (prev >= lines.length - 1) {
          clearInterval(timerRef.current!);
          return prev;
        }
        return prev + 1;
      });
    }, 3200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lines]);

  // Scroll active line into view
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-line="${activeLineIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIndex]);

  return (
    <div className="w-full h-full flex flex-col">
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: `${50 + Math.random() * 40}%`,
                  height: 12,
                  background: "rgba(255,255,255,0.08)",
                }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
              />
            ))}
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Fetching lyrics…
            </p>
          </motion.div>
        )}

        {!isLoading && !lyrics && (
          <motion.div
            key="no-lyrics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4"
          >
            <motion.div
              className="text-4xl"
              animate={{ rotate: [0, -10, 10, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
            >
              ♪
            </motion.div>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              Lyrics not found
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              {songTitle}
            </p>
          </motion.div>
        )}

        {!isLoading && lyrics && lines.length > 0 && (
          <motion.div
            key="lyrics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 overflow-hidden relative"
          >
            {/* Top fade */}
            <div
              className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
              style={{
                height: 48,
                background: "linear-gradient(to bottom, rgba(10,10,10,0.9), transparent)",
              }}
            />
            {/* Bottom fade */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
              style={{
                height: 48,
                background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)",
              }}
            />

            <div
              ref={containerRef}
              className="h-full overflow-y-auto px-4 py-8"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="flex flex-col items-center gap-1 min-h-full justify-center">
                {lines.map((line, i) => {
                  const isActive = i === activeLineIndex;
                  const isPast = i < activeLineIndex;
                  const isNear = Math.abs(i - activeLineIndex) <= 2;

                  return (
                    <motion.p
                      key={`${i}-${line.slice(0, 8)}`}
                      data-line={i}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : isPast ? 0.15 : isNear ? 0.4 : 0.1,
                        scale: isActive ? 1.15 : 1,
                        y: isActive ? 0 : 0,
                        filter: isActive ? "blur(0px)" : isNear ? "blur(1px)" : "blur(2px)",
                      }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="text-center text-lg md:text-2xl leading-relaxed cursor-pointer select-none font-bold py-3 transition-colors"
                      style={{
                        color: isActive ? "var(--neon-accent)" : "white",
                        textShadow: isActive ? "0 0 30px rgba(180,255,220,0.5)" : "none",
                        letterSpacing: isActive ? "-0.02em" : "-0.01em",
                      }}
                      onClick={() => setActiveLineIndex(i)}
                    >
                      {line}
                    </motion.p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
