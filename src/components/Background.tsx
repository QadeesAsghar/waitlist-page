import { BackgroundBeams } from "./BackgroundBeams";
import { ShootingStars } from "./ShootingStars";
import { Starfield } from "./Starfield";

/**
 * Fixed atmosphere layer behind the page: base wash, the violet/blue bloom, a
 * faint grid, the star field, occasional shooting stars, the drifting aurora
 * and film grain to stop the large gradients banding on 8-bit displays.
 */
export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-ink-900" />

      {/*
        Primary hue: a violet bloom hung off the top edge with a smaller blue
        one offset to the right, so the sky reads as two light sources rather
        than one centred glow.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 0%, color-mix(in oklab, var(--violet) 26%, transparent), transparent 70%), radial-gradient(45% 40% at 78% 12%, color-mix(in oklab, var(--blue) 18%, transparent), transparent 70%)",
          opacity: 0.7,
        }}
      />

      {/* Same two blooms again, but drifting — the wash is never quite still */}
      <div
        className="absolute inset-0 animate-drift"
        style={{
          background:
            "radial-gradient(50% 45% at 24% 18%, color-mix(in oklab, var(--violet) 16%, transparent), transparent 72%), radial-gradient(42% 38% at 80% 72%, color-mix(in oklab, var(--blue) 13%, transparent), transparent 72%)",
          opacity: 0.55,
        }}
      />

      {/* Grid sits well back so the stars stay the texture you notice */}
      <div className="bg-grid mask-fade-y absolute inset-0 opacity-40" />

      <Starfield />
      <ShootingStars />
      <BackgroundBeams />

      {/*
        Glass pane over the sky. Specular sheen rather than `backdrop-filter`
        on purpose: a fullscreen blur would re-rasterise every frame behind
        the twinkling stars, and it would smear the stars themselves — glass
        reads through reflection and a lit edge anyway, not through blur.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(147deg, rgb(255 255 255 / 0.055) 0%, rgb(255 255 255 / 0.015) 24%, transparent 44%, transparent 61%, rgb(255 255 255 / 0.02) 83%, rgb(255 255 255 / 0.045) 100%)",
        }}
      />
      {/* Lit top edge — the tell that there's a pane in front of the sky */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/25 to-transparent" />

      {/* Vignette pulls focus to the centre column */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% 0%, transparent 40%, rgba(4,4,9,0.66) 100%)",
        }}
      />

      {/* Frosted grain, a touch heavier now that it doubles as the glass surface */}
      <div className="noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
