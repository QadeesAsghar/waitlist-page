import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../lib/utils";

interface ShootingStar {
  x: number;
  y: number;
  /** radians */
  angle: number;
  /** px per second, so the streak is frame-rate independent */
  speed: number;
  distance: number;
}

interface ShootingStarsProps {
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
  /** Hex, `#rgb` or `#rrggbb` - the bright head of the streak */
  starColor?: string;
  /** Hex - fades to fully transparent along the tail */
  trailColor?: string;
  trailLength?: number;
  thickness?: number;
  maxConcurrent?: number;
  className?: string;
}

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

/**
 * Occasional shooting stars on a canvas.
 *
 * Deliberately infrequent - a constant stream of streaks is what made the
 * earlier meteor layer look cheap. Two or three a minute reads as weather.
 *
 * Position lives in a ref rather than React state: driving this from state
 * costs a re-render per frame, and the spawn chain has to be a ref too so
 * unmount can actually clear it (an uncleared chain doubles up under
 * StrictMode's mount/unmount/remount).
 */
export function ShootingStars({
  minSpeed = 380,
  maxSpeed = 700,
  minDelay = 2600,
  maxDelay = 7000,
  starColor = "#f3f0ff",
  trailColor = "#8b5cf6",
  trailLength = 120,
  thickness = 1.4,
  maxConcurrent = 2,
  className,
}: ShootingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const head = hexToRgb(starColor);
    const tail = hexToRgb(trailColor);

    let stars: ShootingStar[] = [];
    let frame = 0;
    let spawnTimer = 0;
    let last = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /*
     * Only ever travelling downward. The original spawned from the bottom
     * edge heading up, which reads as sparks rather than falling stars, and
     * it measured the vertical sides against `innerWidth`.
     */
    const spawn = () => {
      if (stars.length < maxConcurrent) {
        const jitter = (Math.random() - 0.5) * 0.36;
        const side = Math.floor(Math.random() * 3);
        const down = Math.PI / 4;

        let star: ShootingStar;
        if (side === 0) {
          const rightward = Math.random() < 0.5;
          star = {
            x: Math.random() * width,
            y: -24,
            angle: (rightward ? down : Math.PI - down) + jitter,
            speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
            distance: 0,
          };
        } else if (side === 1) {
          star = {
            x: -24,
            y: Math.random() * height * 0.55,
            angle: down + jitter,
            speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
            distance: 0,
          };
        } else {
          star = {
            x: width + 24,
            y: Math.random() * height * 0.55,
            angle: Math.PI - down + jitter,
            speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
            distance: 0,
          };
        }
        stars.push(star);
      }

      spawnTimer = window.setTimeout(
        spawn,
        minDelay + Math.random() * (maxDelay - minDelay)
      );
    };

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);

      stars = stars.filter((s) => {
        s.x += Math.cos(s.angle) * s.speed * delta;
        s.y += Math.sin(s.angle) * s.speed * delta;
        s.distance += s.speed * delta;

        if (
          s.x < -260 ||
          s.x > width + 260 ||
          s.y < -260 ||
          s.y > height + 260
        ) {
          return false;
        }

        // Grow the trail as it accelerates in, then fade it out on the way off
        const len = Math.min(trailLength, 14 + s.distance * 0.55);
        const tailX = s.x - Math.cos(s.angle) * len;
        const tailY = s.y - Math.sin(s.angle) * len;

        const fadeIn = Math.min(1, s.distance / 60);
        const travel = Math.max(width, height);
        const fadeOut = Math.max(0, 1 - Math.max(0, s.distance - travel * 0.55) / (travel * 0.45));
        const alpha = fadeIn * fadeOut * 0.85;
        if (alpha <= 0.01) return true;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, `rgba(${tail.r},${tail.g},${tail.b},0)`);
        grad.addColorStop(
          0.72,
          `rgba(${tail.r},${tail.g},${tail.b},${alpha * 0.55})`
        );
        grad.addColorStop(1, `rgba(${head.r},${head.g},${head.b},${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        return true;
      });

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // A backgrounded tab shouldn't bank up a queue of streaks
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        window.clearTimeout(spawnTimer);
      } else {
        start();
        spawnTimer = window.setTimeout(spawn, minDelay);
      }
    };

    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    resize();
    start();
    spawnTimer = window.setTimeout(spawn, minDelay);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(spawnTimer);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    minSpeed,
    maxSpeed,
    minDelay,
    maxDelay,
    starColor,
    trailColor,
    trailLength,
    thickness,
    maxConcurrent,
    reduce,
  ]);

  if (reduce) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-0", className)}
    />
  );
}
