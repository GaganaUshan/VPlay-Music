"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface VisualizerProps {
  isPlaying: boolean;
}

/**
 * Circular audio visualizer using Web Audio API + microphone input.
 * Falls back to a pure Framer Motion simulated visualizer if
 * microphone permission is denied or unavailable.
 */
export default function Visualizer({ isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMicActiveRef = useRef(false);
  const simulatedPhaseRef = useRef(0);

  const drawVisualizer = useCallback(
    (dataArray: Uint8Array | null, bufferLength: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const baseRadius = Math.min(W, H) * 0.28;

      ctx.clearRect(0, 0, W, H);

      // Background glow circle
      const grd = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 1.8);
      grd.addColorStop(0, isPlaying ? "rgba(180,255,220,0.04)" : "rgba(255,255,255,0.02)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      const bars = 64;
      const step = bufferLength > 0 ? Math.floor(bufferLength / bars) : 1;

      ctx.lineCap = "round";
      
      for (let i = 0; i < bars; i++) {
        let value: number;

        if (dataArray && dataArray.length > 0 && isPlaying) {
          value = dataArray[i * step] / 255;
        } else if (isPlaying) {
          simulatedPhaseRef.current += 0.008;
          const phase = simulatedPhaseRef.current;
          const angle = (i / bars) * Math.PI * 2;
          value =
            0.2 +
            0.2 * Math.sin(angle * 2 + phase) +
            0.1 * Math.sin(angle * 5 - phase * 0.8);
          value = Math.max(0.05, Math.min(1, value));
        } else {
          const angle = (i / bars) * Math.PI * 2;
          value = 0.03 + 0.015 * Math.sin(angle * 4 + Date.now() * 0.001);
        }

        const barLength = value * baseRadius * 0.7;
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;

        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barLength);
        const y2 = cy + Math.sin(angle) * (baseRadius + barLength);

        // Gradient for bars
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, isPlaying ? "rgba(180,255,220,0.8)" : "rgba(255,255,255,0.3)");
        grad.addColorStop(1, isPlaying ? "rgba(180,255,220,0)" : "rgba(255,255,255,0)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = isPlaying ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Little glow dots at the tips
        if (isPlaying && value > 0.4) {
          ctx.fillStyle = "rgba(180,255,220,0.5)";
          ctx.beginPath();
          ctx.arc(x2, y2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Inner glass circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fill();
      ctx.strokeStyle = isPlaying ? "rgba(180,255,220,0.15)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    },
    [isPlaying]
  );

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (analyser && isMicActiveRef.current) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      drawVisualizer(dataArray, analyser.frequencyBinCount);
    } else {
      simulatedPhaseRef.current += 0.003;
      drawVisualizer(null, 0);
    }
    animRef.current = requestAnimationFrame(tick);
  }, [drawVisualizer]);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;
      isMicActiveRef.current = true;
    } catch {
      // Permission denied — fallback to simulated
      isMicActiveRef.current = false;
    }
  }, []);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    isMicActiveRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startMic();
    } else {
      stopMic();
    }
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, startMic, stopMic, tick]);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: "100%", maxWidth: 320, aspectRatio: "1" }}
      animate={isPlaying ? { scale: [1, 1.01, 1] } : { scale: 1 }}
      transition={
        isPlaying
          ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
          : {}
      }
    >
      {/* Outer glow when playing */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 40px rgba(180,255,220,0.08)",
              "0 0 70px rgba(180,255,220,0.15)",
              "0 0 40px rgba(180,255,220,0.08)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-full"
        aria-hidden="true"
      />

      {/* Center dot */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 8,
          height: 8,
          background: isPlaying ? "var(--neon-accent)" : "rgba(255,255,255,0.3)",
        }}
        animate={isPlaying ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : {}}
        transition={isPlaying ? { repeat: Infinity, duration: 1.5 } : {}}
      />
    </motion.div>
  );
}
