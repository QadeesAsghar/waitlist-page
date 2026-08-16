import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface TextGenerateEffectProps {
  /** Lines of text; each renders on its own row so wrapping stays controlled */
  lines: (string | ReactNode)[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
}

/**
 * Word-by-word blur reveal.
 *
 * Unlike the previous version there is no mount gate - the text is always in
 * the DOM (it's the page's LCP element and its h1), only its animation state
 * changes. Under reduced motion it renders instantly with no transform.
 */
export function TextGenerateEffect({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
  stagger = 0.055,
}: TextGenerateEffectProps) {
  const reduce = useReducedMotion();
  let wordIndex = 0;

  return (
    <span className={className}>
      {lines.map((line, lineIdx) => {
        // Non-string lines (a gradient <span>, say) animate as one unit
        if (typeof line !== "string") {
          const idx = wordIndex++;
          return (
            <span key={lineIdx} className={`block ${lineClassName}`}>
              <motion.span
                className="inline-block"
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: "0.4em", filter: "blur(12px)" }
                }
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, y: "0em", filter: "blur(0px)" }
                }
                transition={{
                  duration: reduce ? 0.3 : 0.9,
                  delay: reduce ? 0 : delay + idx * stagger,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {line}
              </motion.span>
            </span>
          );
        }

        return (
          <span key={lineIdx} className={`block ${lineClassName}`}>
            {line.split(" ").map((word, i) => {
              const idx = wordIndex++;
              return (
                <motion.span
                  key={`${word}-${i}`}
                  className="inline-block whitespace-pre"
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: "0.4em", filter: "blur(12px)" }
                  }
                  animate={
                    reduce
                      ? { opacity: 1 }
                      : { opacity: 1, y: "0em", filter: "blur(0px)" }
                  }
                  transition={{
                    duration: reduce ? 0.3 : 0.9,
                    delay: reduce ? 0 : delay + idx * stagger,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {word}
                  {i < line.split(" ").length - 1 ? " " : ""}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
