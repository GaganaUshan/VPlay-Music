"use client";

import React, { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onClose();
      }
    });

    return () => subscription.unsubscribe();
  }, [onClose]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-premium rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight mb-2">Welcome to VPlay</h2>
              <p className="text-sm text-white/50">Login to save your favorites and sync across devices.</p>
            </div>

            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#b4ffdc',
                      brandAccent: '#80ffc0',
                      inputBackground: 'rgba(255,255,255,0.05)',
                      inputText: 'white',
                      inputPlaceholder: 'rgba(255,255,255,0.3)',
                      inputBorder: 'rgba(255,255,255,0.1)',
                      inputBorderFocus: '#b4ffdc',
                    },
                    radii: {
                      borderRadiusButton: '1rem',
                      buttonBorderRadius: '1rem',
                      inputBorderRadius: '1rem',
                    },
                    fonts: {
                      bodyFontFamily: 'inherit',
                      inputFontFamily: 'inherit',
                      buttonFontFamily: 'inherit',
                    },
                  },
                },
              }}
              theme="dark"
              providers={["google"]}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
