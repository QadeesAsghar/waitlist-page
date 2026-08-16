import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { cn } from "../lib/utils";
import { solveChallenge } from "../lib/pow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Shared by the real input and the glyph overlay so their metrics match. */
const FIELD_TEXT = "text-base leading-none tracking-normal";

interface TokenResponse {
  token: string;
  challenge: string;
  difficulty: number;
}

export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState(""); // Honeypot 1
  const [fax, setFax] = useState(""); // Honeypot 2
  const [submitted, setSubmitted] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<TokenResponse | null>(null);
  const powPromiseRef = useRef<Promise<string> | null>(null);

  // Prefetch token & start PoW background solve early
  useEffect(() => {
    let unmounted = false;
    const fetchToken = async () => {
      try {
        const res = await fetch("/api/waitlist/token");
        if (!res.ok) return;
        const data: TokenResponse = await res.json();
        if (unmounted) return;
        ticketRef.current = data;
        // Background solve PoW challenge immediately so user never feels latency
        powPromiseRef.current = solveChallenge(data.challenge, data.difficulty);
      } catch {
        // Fallback gracefully if offline or server booting
      }
    };
    fetchToken();
    return () => {
      unmounted = true;
    };
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  /*
   * "Typing energy": each keystroke adds to it, every frame bleeds it away.
   * Typing fast builds it up and it fades a beat after you stop, which reads
   * far better than a per-keystroke animation that restarts and stutters.
   */
  const energy = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    const v = energy.get();
    if (v <= 0.0005) return;
    energy.set(Math.max(0, v - delta / 620));
  });

  const underlineOpacity = useTransform(energy, [0, 1], [0, 0.95]);
  const underlineScale = useTransform(energy, [0, 1], [0.25, 1]);
  const bloomOpacity = useTransform(energy, [0, 1], [0.55, 0.55]);

  // The overlay is a separate scroll box; keep it pinned to the real caret.
  const syncScroll = () => {
    const input = inputRef.current;
    const overlay = overlayRef.current;
    if (input && overlay) overlay.scrollLeft = input.scrollLeft;
  };

  useEffect(syncScroll, [email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;

    const value = email.trim();
    if (!value) {
      setError("Enter your email address to continue.");
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError("That doesn't look like a valid email address.");
      return;
    }

    setError(null);
    setStatus("loading");

    try {
      // Ensure we have a token
      let ticket = ticketRef.current;
      if (!ticket) {
        const res = await fetch("/api/waitlist/token");
        if (!res.ok) {
          throw new Error("Unable to establish secure session. Please retry.");
        }
        ticket = await res.json();
        ticketRef.current = ticket;
        powPromiseRef.current = solveChallenge(ticket!.challenge, ticket!.difficulty);
      }

      // Resolve PoW Nonce
      const nonce = await (powPromiseRef.current || solveChallenge(ticket!.challenge, ticket!.difficulty));

      const payload = {
        email: value,
        token: ticket!.token,
        nonce,
        company_website: companyWebsite,
        fax,
        source: "landing",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        locale: typeof navigator !== "undefined" ? navigator.language : "",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to join waitlist. Please try again.");
      }

      setSubmitted(value);
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please retry.";
      setError(msg);
      setStatus("idle");
      // Refresh token for subsequent attempt
      ticketRef.current = null;
      powPromiseRef.current = null;
      fetch("/api/waitlist/token")
        .then((r) => r.json())
        .then((data) => {
          ticketRef.current = data;
          powPromiseRef.current = solveChallenge(data.challenge, data.difficulty);
        })
        .catch(() => {});
    }
  };

  const loading = status === "loading";
  const valid = EMAIL_RE.test(email.trim());
  // Reduced motion keeps the native glyphs and skips the overlay entirely.
  const animateGlyphs = !reduce;

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {status !== "done" ? (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/*
              Phones get two stacked full-width controls; from `sm` up the two
              merge into a single pill. Cramming an input and a button side by
              side below ~400px left the placeholder clipped to a few letters.
            */}
            {/* Off-screen honeypots to catch spam bots without affecting humans */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
              />
              <input
                type="text"
                name="fax"
                tabIndex={-1}
                autoComplete="off"
                value={fax}
                onChange={(e) => setFax(e.target.value)}
              />
            </div>

            <div
              onMouseMove={handleMouseMove}
              className={cn(
                "group relative flex flex-col gap-2.5 overflow-hidden",
                "sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:p-1.5",
                "sm:bg-white/[0.03] sm:backdrop-blur-xl sm:transition-all sm:duration-300",
                focused ? "sm:border-zinc-500/40 sm:shadow-glow-sm" : "sm:border-white/10"
              )}
            >
              <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl sm:rounded-full opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      250px circle at ${mouseX}px ${mouseY}px,
                      rgba(255, 255, 255, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>

              <div
                className={cn(
                  "relative min-h-12 w-full rounded-2xl border transition-colors",
                  "sm:min-h-11 sm:rounded-full sm:border-transparent sm:bg-transparent",
                  error
                    ? "border-red-500/50 bg-red-500/[0.06]"
                    : "border-white/10 bg-white/[0.04]"
                )}
              >
                {/* Warm bloom that swells while the user is typing */}
                {animateGlyphs && (
                  <motion.span
                    aria-hidden="true"
                    style={{ opacity: bloomOpacity }}
                    className="pointer-events-none absolute -inset-1 rounded-[inherit] bg-brand-400/15 blur-md"
                  />
                )}

                <input
                  ref={inputRef}
                  id="waitlist-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                    energy.set(Math.min(1, energy.get() + 0.38));
                  }}
                  onScroll={syncScroll}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  enterKeyHint="go"
                  aria-invalid={!!error}
                  aria-describedby={error ? "waitlist-error" : undefined}
                  className={cn(
                    // 16px text keeps iOS Safari from zooming the page on focus
                    "absolute inset-0 h-full w-full rounded-[inherit] bg-transparent",
                    "pr-11 pl-5 text-white outline-none placeholder:text-white/35",
                    FIELD_TEXT,
                    animateGlyphs && "typed-input"
                  )}
                />

                {/* Glyph layer: only a newly typed index mounts, so only it animates */}
                {animateGlyphs && (
                  <div
                    ref={overlayRef}
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 flex items-center overflow-hidden",
                      "rounded-[inherit] pr-11 pl-5",
                      FIELD_TEXT
                    )}
                  >
                    <span className="whitespace-pre text-white">
                      {email.split("").map((char, i) => (
                        <motion.span
                          // Inline (not inline-block) on purpose: transforms would
                          // need a block box, and that changes glyph advances just
                          // enough to drift away from the real caret.
                          key={i}
                          initial={{ opacity: 0, filter: "blur(4px)", color: "#ddc79b" }}
                          animate={{ opacity: 1, filter: "blur(0px)", color: "#ffffff" }}
                          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </span>
                  </div>
                )}

                {/* Underline charge — width tracks how hard you're typing */}
                {animateGlyphs && (
                  <motion.span
                    aria-hidden="true"
                    style={{ opacity: underlineOpacity, scaleX: underlineScale }}
                    className="pointer-events-none absolute inset-x-5 bottom-1 h-px origin-center bg-gradient-to-r from-transparent via-brand-300 to-transparent"
                  />
                )}

                {/* Reserved 44px gutter, so this can't reflow the text */}
                <AnimatePresence>
                  {valid && (
                    <motion.span
                      key="valid"
                      aria-hidden="true"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                      transition={{ type: "spring", bounce: 0.55, duration: 0.5 }}
                      className="pointer-events-none absolute top-1/2 right-4 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-brand-400/15"
                    >
                      <Check className="h-3 w-3 text-brand-300" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <MagneticButton
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className={cn(
                  "sheen relative inline-flex min-h-12 w-full items-center justify-center overflow-hidden rounded-2xl",
                  "bg-white px-7 text-sm font-semibold text-ink-950 shadow-lg",
                  "transition-[background,opacity] hover:bg-brand-50 disabled:opacity-70",
                  "sm:min-h-11 sm:w-auto sm:shrink-0 sm:rounded-full"
                )}
              >
                {/* Both states share one grid cell so the width never jumps */}
                <span className="grid place-items-center">
                  <span
                    className={cn(
                      "col-start-1 row-start-1 flex items-center gap-2 transition-opacity duration-200",
                      loading && "opacity-0"
                    )}
                  >
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      "col-start-1 row-start-1 transition-opacity duration-200",
                      !loading && "opacity-0"
                    )}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                </span>
              </MagneticButton>
            </div>

            {/* Reserve nothing when empty — the row animates its own height */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  id="waitlist-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden text-sm text-red-300"
                >
                  <span className="block pt-2.5">{error}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            role="status"
            aria-live="polite"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass bevel flex flex-col items-center rounded-3xl px-6 py-8 text-center"
          >
            <motion.span
              initial={reduce ? { opacity: 0 } : { scale: 0 }}
              animate={reduce ? { opacity: 1 } : { scale: 1 }}
              transition={{ type: "spring", bounce: 0.45, delay: 0.1 }}
              className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-mint-500/25 bg-mint-500/10 shadow-[0_0_36px_-6px_rgba(127,156,116,0.45)]"
            >
              <Check className="h-6 w-6 text-mint-400" />
            </motion.span>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              You're on the list
            </h3>
            <p className="mt-2 max-w-sm text-sm text-white/55">
              We'll email{" "}
              <span className="font-medium break-all text-white">{submitted}</span>{" "}
              the moment your workspace is ready.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
