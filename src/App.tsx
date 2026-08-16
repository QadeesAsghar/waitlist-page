import { motion } from "framer-motion";
import { Background } from "./components/Background";
import { Hero } from "./components/Hero";

// Requested links for footer with inline SVGs for perfect rendering
const SOCIALS = [
  {
    href: "https://whatsapp.com/channel/0029VbDfaOvF6smtYgb6hn2f",
    label: "WhatsApp Channel",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.677.15-.2.301-.777.978-.953 1.179-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.675-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.451-.527.15-.176.2-.301.301-.501.1-.2.05-.376-.025-.526-.075-.15-.677-1.63-.928-2.232-.244-.587-.493-.507-.677-.517l-.577-.01c-.2 0-.527.075-.802.376-.276.301-1.053 1.028-1.053 2.507 0 1.479 1.078 2.908 1.229 3.109.15.2 2.122 3.24 5.14 4.544.718.31 1.279.495 1.716.634.721.23 1.377.197 1.895.12.577-.087 1.78-.727 2.03-1.429.251-.702.251-1.304.176-1.43-.075-.126-.276-.201-.577-.351zM12.04 2C6.52 2 2.04 6.48 2.04 12c0 1.954.563 3.778 1.536 5.323L2 22l4.823-1.532A9.92 9.92 0 0 0 12.04 22c5.52 0 10-4.48 10-10S17.56 2 12.04 2z" />
      </svg>
    ),
  },
  {
    href: "https://github.com/QadeesAsghar",
    label: "GitHub",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/company/slangofficial/",
    label: "LinkedIn",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 0 0-1.64 1.64c0 .9.74 1.64 1.64 1.64.91 0 1.65-.74 1.65-1.64 0-.9-.74-1.64-1.65-1.64z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/slang_chat?igsh=aG10Znpjc250M3c1",
    label: "Instagram",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
];

export default function App() {
  return (
    <div className="relative flex min-h-[100svh] flex-col">
      <Background />

      <header className="relative z-10 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <motion.a
            href="#top"
            initial="rest"
            whileHover="hover"
            animate="rest"
            className="group relative inline-flex items-center rounded-xl px-3 py-1.5 transition-all duration-300"
          >
            {/* Ambient subtle back-glow on hover */}
            <motion.div
              variants={{
                rest: { opacity: 0, scale: 0.8 },
                hover: {
                  opacity: 0.65,
                  scale: 1.25,
                  transition: { duration: 0.4, ease: "easeOut" },
                },
              }}
              className="absolute inset-0 -z-10 rounded-xl bg-white/5 blur-xl pointer-events-none"
            />

            {/* Premium Rolling Slot Machine typography */}
            <div className="flex items-center">
              {"Slang".split("").map((letter, i) => (
                <div key={i} className="relative overflow-hidden">
                  <motion.span
                    variants={{
                      rest: { y: 0, opacity: 1 },
                      hover: { y: "-100%", opacity: 0 },
                    }}
                    transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block bg-gradient-to-br from-white/90 via-white/80 to-white/50 bg-clip-text text-xl font-extrabold tracking-tight text-transparent transition-colors duration-300 group-hover:from-white group-hover:via-white group-hover:to-white/90 select-none"
                  >
                    {letter}
                  </motion.span>
                  <motion.span
                    variants={{
                      rest: { y: "100%", opacity: 0 },
                      hover: { y: 0, opacity: 1 },
                    }}
                    transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 inline-block bg-gradient-to-br from-white/90 via-white/80 to-white/50 bg-clip-text text-xl font-extrabold tracking-tight text-transparent transition-colors duration-300 group-hover:from-white group-hover:via-white group-hover:to-white/90 select-none"
                    aria-hidden="true"
                  >
                    {letter}
                  </motion.span>
                </div>
              ))}
            </div>
          </motion.a>

          <a
            href="#waitlist"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white sm:text-sm"
          >
            Get early access
          </a>
        </div>
      </header>

      <Hero />

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 1.1 }}
        className="relative z-10 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-3xl flex-col-reverse items-center gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Slang Labs, Inc.
          </p>

          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="group relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-white/[0.08] hover:text-brand-300 hover:shadow-[0_0_16px_rgba(168,85,247,0.3)]"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
