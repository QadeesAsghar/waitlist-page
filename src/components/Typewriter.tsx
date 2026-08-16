import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../lib/utils";

interface TypewriterProps {
  /** Pass a stable, module-level array — see the `key` note below. */
  phrases: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  /** How long a finished phrase sits before it starts deleting */
  holdMs?: number;
  startDelay?: number;
  loop?: boolean;
  align?: "center" | "left";
  className?: string;
  /** Set false to type once and drop the caret at the end */
  caret?: boolean;
}

export function Typewriter({
  phrases,
  typeSpeed = 58,
  deleteSpeed = 28,
  holdMs = 1900,
  startDelay = 0,
  loop = true,
  align = "center",
  className,
  caret = true,
}: TypewriterProps) {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [finished, setFinished] = useState(false);

  // The longest phrase reserves the box, so neighbouring text never reflows
  // as characters land — only the typed word itself changes width.
  const longest = useMemo(
    () => phrases.reduce((a, b) => (b.length >= a.length ? b : a), ""),
    [phrases]
  );

  // Depend on the joined string rather than array identity: an inline array
  // literal would be a new reference each render and restart the machine.
  const signature = phrases.join("|");
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    if (reduce) {
      setText(phrasesRef.current[0] ?? "");
      setFinished(true);
      return;
    }

    let timer = 0;
    let cancelled = false;
    let phrase = 0;
    let index = 0;
    let deleting = false;

    // A little variance per keystroke reads as typing; a fixed interval
    // reads as a machine.
    const humanise = (base: number) => base * (0.72 + Math.random() * 0.7);

    const step = () => {
      if (cancelled) return;
      const list = phrasesRef.current;
      const current = list[phrase] ?? "";

      if (!deleting) {
        index += 1;
        setText(current.slice(0, index));

        if (index >= current.length) {
          if (!loop && phrase === list.length - 1) {
            setFinished(true);
            return;
          }
          deleting = true;
          timer = window.setTimeout(step, holdMs);
          return;
        }
        timer = window.setTimeout(step, humanise(typeSpeed));
        return;
      }

      index -= 1;
      setText(current.slice(0, Math.max(index, 0)));

      if (index <= 0) {
        deleting = false;
        phrase = (phrase + 1) % list.length;
        timer = window.setTimeout(step, 340);
        return;
      }
      timer = window.setTimeout(step, humanise(deleteSpeed));
    };

    timer = window.setTimeout(step, startDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signature, typeSpeed, deleteSpeed, holdMs, startDelay, loop, reduce]);

  const showCaret = caret && !finished;

  return (
    <span className="relative inline-block">
      {/* Sizer: same classes so metrics match exactly */}
      <span aria-hidden="true" className={cn("invisible whitespace-pre", className)}>
        {longest}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0 whitespace-pre border-r-2 border-transparent",
          align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
          showCaret && "animate-caret",
          className
        )}
      >
        {text}
      </span>

      {/* Screen readers get the sentence once, not one character at a time */}
      <span className="sr-only">{phrases.join(", ")}</span>
    </span>
  );
}
