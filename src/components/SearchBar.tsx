"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
  isPlayerOpen: boolean;
}

export default function SearchBar({ onSelect, isPlayerOpen }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
        setIsOpen(true);
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchResults(query);
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    onSelect(result);
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Strip HTML entities from YouTube titles
  const cleanTitle = (title: string) =>
    title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div
          className="glass glow-border flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300"
          style={{
            boxShadow: isOpen
              ? "0 0 0 1px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.08)"
              : undefined,
          }}
        >
          <motion.div
            animate={{ rotate: isLoading ? 360 : 0 }}
            transition={
              isLoading
                ? { repeat: Infinity, duration: 1, ease: "linear" }
                : { duration: 0 }
            }
          >
            <Search
              size={18}
              className="shrink-0"
              style={{ color: "var(--text-secondary)" }}
            />
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={isPlayerOpen ? "Search another song…" : "Search songs, artists…"}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-white/30"
            style={{ color: "var(--text-primary)" }}
            aria-label="Search songs"
            autoComplete="off"
            spellCheck={false}
          />

          {query && (
            <motion.button
              type="button"
              onClick={clearQuery}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="shrink-0 hover:text-white/80 transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label="Clear search"
            >
              <X size={16} />
            </motion.button>
          )}

          <kbd
            className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border shrink-0"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              color: "var(--text-muted)",
              fontSize: "10px",
            }}
          >
            /
          </kbd>
        </div>
      </form>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-full mt-2 w-full glass-premium glow-border rounded-2xl overflow-hidden z-50 shadow-2xl"
          >
            <div className="max-height-[480px] overflow-y-auto custom-scrollbar" style={{ maxHeight: "480px" }}>
            {error && (
              <div className="px-4 py-3 text-sm" style={{ color: "rgba(255,120,120,0.8)" }}>
                {error}
              </div>
            )}

            {!error && results.length === 0 && !isLoading && (
              <div
                className="px-4 py-4 text-sm text-center"
                style={{ color: "var(--text-muted)" }}
              >
                No results found
              </div>
            )}

            {results.map((result: SearchResult, i: number) => (
              <motion.button
                key={result.videoId}
                onClick={() => handleSelect(result)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.15 }}
                className="w-full text-left px-4 py-3 flex flex-col gap-0.5 border-b last:border-b-0 transition-colors duration-150 group"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
                aria-label={`Play ${cleanTitle(result.title)}`}
              >
                <span
                  className="text-sm font-medium leading-snug line-clamp-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cleanTitle(result.title)}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {result.channel}
                </span>
              </motion.button>
            ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
