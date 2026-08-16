/**
 * Ambient violet/blue aurora wash behind the page.
 *
 * Soft edges come from radial-gradient falloff rather than `filter: blur()`
 * — a blurred element that also animates forces a full re-rasterise every
 * frame, which is what made the old version stutter on mobile.
 */
export function BackgroundBeams() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Primary bloom behind the hero */}
      <div
        className="absolute -top-[22rem] left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 animate-aurora rounded-full sm:h-[52rem] sm:w-[52rem]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.08) 38%, transparent 68%)",
        }}
      />

      {/* Flanking washes — hidden on phones, where they only cost paint */}
      <div
        className="absolute top-[18%] -left-64 hidden h-[34rem] w-[34rem] animate-aurora rounded-full [animation-delay:-9s] md:block"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute top-[52%] -right-64 hidden h-[36rem] w-[36rem] animate-aurora rounded-full [animation-delay:-16s] md:block"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.13) 0%, transparent 65%)",
        }}
      />
    </div>
  );
}
