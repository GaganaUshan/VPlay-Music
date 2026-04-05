"use client";

import React, { useEffect, useRef } from "react";

/**
 * AnimatedBackground — renders an ethereal, organic background with 
 * floating blobs and subtle particles. Reacts to movement and time.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      originalSize: number;
    }> = [];

    const blobs: Array<{
      x: number;
      y: number;
      r: number;
      tx: number;
      ty: number;
      v: number;
      c: string;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const init = () => {
      particles = Array.from({ length: 60 }, () => {
        const size = Math.random() * 2 + 0.5;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: size,
          originalSize: size,
          color: `rgba(255, 255, 255, ${Math.random() * 0.15 + 0.05})`,
        };
      });

      blobs.length = 0;
      // Large ambient blobs
      blobs.push({
        x: canvas.width * 0.2,
        y: canvas.height * 0.3,
        r: canvas.width * 0.4,
        tx: Math.random() * 1000,
        ty: Math.random() * 1000,
        v: 0.0005,
        c: "rgba(255, 255, 255, 0.015)"
      });
      blobs.push({
        x: canvas.width * 0.8,
        y: canvas.height * 0.7,
        r: canvas.width * 0.35,
        tx: Math.random() * 1000,
        ty: Math.random() * 1000,
        v: 0.0007,
        c: "rgba(180, 255, 220, 0.012)"
      });
    };

    let t = 0;
    const draw = () => {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      t += 0.005;

      // Draw Blobs
      ctx.filter = "blur(100px)";
      blobs.forEach(b => {
        b.tx += b.v;
        b.ty += b.v;
        const nx = b.x + Math.sin(b.tx) * 100;
        const ny = b.y + Math.cos(b.ty) * 80;
        
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(nx, ny, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.filter = "none";

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulse = Math.sin(t + p.x * 0.01) * 0.5 + 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
