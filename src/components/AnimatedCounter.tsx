import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
};

/**
 * Counts up to `to` the first time it scrolls into view.
 *
 * The server-rendered markup contains the final number (not "0"), so the value
 * is visible to search engines, link previews and visitors without JavaScript.
 * The count-up only replaces it once the element is actually on screen.
 */
export function AnimatedCounter({ to, suffix = "", duration = 1.8, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2, margin: "-80px" });
  const plays = useRef(0);
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => Math.round(to).toLocaleString());

  useEffect(() => {
    if (!inView || reduceMotion || plays.current >= 3) return;
    plays.current += 1;
    const controls = animate(0, to, {
      duration,
      // Smoother mid-run, no long tail — feels premium and lands cleanly on the final digit.
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplay(Math.round(value).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, to, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
      {suffix}
    </motion.span>
  );
}
