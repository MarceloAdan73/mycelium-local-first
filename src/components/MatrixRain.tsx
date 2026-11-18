"use client";

import { useEffect, useRef } from "react";

const CHARS =
  "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let drops: Drop[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops();
    };

    const initDrops = () => {
      const cols = Math.floor(canvas.width / 20);
      drops = Array.from({ length: cols }, (_, i) => {
        const len = 6 + Math.floor(Math.random() * 14);
        return {
          x: i * 20,
          y: -len * 20 - Math.random() * canvas.height,
          speed: 0.5 + Math.random() * 1.5,
          length: len,
          chars: Array.from({ length: len }, () =>
            CHARS[Math.floor(Math.random() * CHARS.length)]
          ),
        };
      });
    };

    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 8, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "14px monospace";

      for (const drop of drops) {
        drop.y += drop.speed;

        for (let i = 0; i < drop.length; i++) {
          const y = drop.y - i * 20;
          if (y < -20 || y > canvas.height + 20) continue;

          if (i === 0) {
            ctx.fillStyle = "rgba(0, 255, 136, 0.15)";
          } else {
            const alpha = 0.08 * (1 - i / drop.length);
            ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
          }

          if (Math.random() < 0.02) {
            drop.chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }

          ctx.fillText(drop.chars[i], drop.x, y);
        }

        if (drop.y - drop.length * 20 > canvas.height + 40) {
          drop.y = -drop.length * 20;
          drop.speed = 0.5 + Math.random() * 1.5;
        }
      }

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
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
