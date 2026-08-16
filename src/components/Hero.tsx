import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { TextGenerateEffect } from "./TextGenerateEffect";
import { Typewriter } from "./Typewriter";
import { WaitlistForm } from "./WaitlistForm";
import { Avatars } from "./Avatars";

// Module-level so the array identity is stable across renders
const HEADLINE_PHRASES = [
  "like infrastructure.",
  "like clockwork.",
  "to feel instant.",
  "that never sleeps.",
];

export function Hero() {
  return (
    <main
      id="top"
      className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-16"
    >
      <div className="mx-auto w-full max-w-3xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 flex justify-center sm:mb-9"
        >
          <span className="spin-border inline-flex rounded-full p-px">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink-900/90 px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute h-2 w-2 animate-pulse-ring rounded-full bg-brand-400" />
                <span className="relative h-2 w-2 rounded-full bg-brand-500" />
              </span>
              <span className="text-[10px] font-semibold tracking-[0.14em] text-brand-100 uppercase sm:text-[11px]">
                Private Beta • Q4 2026
              </span>
            </span>
          </span>
        </motion.div>

        {/* Headline - fluid so the longest phrase still fits at 320px */}
        <h1 className="text-[clamp(1.95rem,8.4vw,4.5rem)] leading-[1.06] font-bold tracking-[-0.035em] text-balance">
          <TextGenerateEffect lines={["Support, engineered"]} delay={0.15} />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.15 }}
            className="block"
          >
            <Typewriter
              phrases={HEADLINE_PHRASES}
              className="text-gradient"
              startDelay={1350}
              holdMs={2100}
            />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-xl text-[clamp(0.97rem,2.6vw,1.13rem)] leading-relaxed font-normal text-white/55 sm:mt-7"
        >
          Live chat, analytics and automation in one silent,
          keyboard-first command center your customers never wait on.
        </motion.p>

        {/* Form */}
        <motion.div
          id="waitlist"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 w-full max-w-md sm:mt-10"
        >
          <WaitlistForm />

          <p className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-white/35">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Free during beta · No credit card · Unsubscribe anytime
          </p>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:mt-11 sm:flex-row sm:gap-4"
        >
          <Avatars />
          <p className="text-xs tracking-wide text-white/40">
            Join <span className="font-medium text-white/75">4,200+</span> teams
            already waiting
          </p>
        </motion.div>
      </div>
    </main>
  );
}
