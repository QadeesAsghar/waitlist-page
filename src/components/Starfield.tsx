import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../lib/utils";

interface Star {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  /** null = this one never twinkles */
  twinkleSpeed: number | null;
  phase: number;
}

interface StarfieldProps {
  starDensity?: number;
  twinkleProbability?: number;
  minTwinkleSpeed?: number;
  maxTwinkleSpeed?: number;
  className?: string;
}

/**
 * Twinkling star field.
 *
 * Stars hold position and only vary in brightness — the previous version
 * drifted every particle down the screen, which read as falling snow rather
 * than a sky.
 *
 * Kept off React state on purpose: the star list lives in a ref and the loop
 * paints straight to the canvas, so a 60fps twinkle costs zero re-renders.
 * The canvas is DPR-aware (sub-pixel dots go mushy at 1x on retina), re-seeds
 * on resize, and parks itself while the tab is hidden.
 */
export function Starfield({
  starDensity = 0.00016,
  twinkleProbability = 0.7,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  className,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const seed = () => {
      const count = Math.round(
        Math.min(320, Math.max(40, width * height * starDensity))
      );
      stars = Array.from({ length: count }, () => {
        const twinkles = Math.random() < twinkleProbability;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.85 + 0.35,
          baseOpacity: Math.random() * 0.5 + 0.35,
          twinkleSpeed: twinkles
            ? minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
            : null,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const paint = (seconds: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const alpha =
          star.twinkleSpeed === null
            ? star.baseOpacity
            : star.baseOpacity *
              (0.55 +
                0.45 * Math.sin(seconds / star.twinkleSpeed + star.phase));

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 226, 248, ${alpha})`;
        ctx.fill();
      }
    };

    resize();

    // A static sky is the whole effect when the user asked for less motion
    if (reduce) {
      paint(0);
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }

    const tick = (now: number) => {
      paint(now / 1000);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    };

    // Debounce resize — mobile browsers fire it continuously as the URL bar slides
    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    starDensity,
    twinkleProbability,
    minTwinkleSpeed,
    maxTwinkleSpeed,
    reduce,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-0", className)}
    />
  );
}
