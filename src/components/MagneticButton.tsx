import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { cn } from "../lib/utils";

type NativeButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  | "ref"
  | "style"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "children"
>;

interface MagneticButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** How far the button leans toward the cursor, 0–1 */
  strength?: number;
  className?: string;
}

/**
 * Button that leans toward the cursor.
 *
 * Position is held in motion values, so a mousemove writes straight to the
 * compositor instead of setting state 60×/second. Scale comes from framer's
 * `whileTap` rather than a Tailwind `active:scale-*` class, which would be
 * silently overwritten by the inline transform framer already owns.
 *
 * Disabled on coarse pointers — there is no cursor to chase, and the offset
 * would just make the tap target drift under a thumb.
 */
export function MagneticButton({
  children,
  strength = 0.22,
  className,
  disabled,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const [magnetic, setMagnetic] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 17, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 220, damping: 17, mass: 0.3 });

  useEffect(() => {
    setMagnetic(
      !reduce && window.matchMedia("(pointer: fine)").matches
    );
  }, [reduce]);

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!magnetic || disabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      {...props}
      ref={ref}
      disabled={disabled}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      style={{ x: springX, y: springY }}
      whileTap={disabled || reduce ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("min-h-11 cursor-pointer disabled:cursor-not-allowed", className)}
    >
      {children}
    </motion.button>
  );
}
