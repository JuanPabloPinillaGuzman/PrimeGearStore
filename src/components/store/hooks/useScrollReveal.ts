"use client";

import { useInView } from "motion/react";
import { useRef, type RefObject } from "react";

interface UseScrollRevealOptions {
  /** Fraction of element visible before triggering (0–1). Default: 0.15 */
  threshold?: number;
  /** Fire only once and stay visible. Default: true */
  once?: boolean;
}

/**
 * Returns a [ref, isInView] tuple for scroll-triggered animations.
 * Usage:
 *   const [ref, isVisible] = useScrollReveal();
 *   <motion.div ref={ref} animate={{ opacity: isVisible ? 1 : 0 }} />
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
): [RefObject<T | null>, boolean] {
  const { threshold = 0.15, once = true } = options;
  const ref = useRef<T>(null);
  const isInView = useInView(ref, { amount: threshold, once });
  return [ref, isInView];
}
