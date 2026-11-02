"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { placeholderFor } from "@/lib/imagePlaceholders";

/**
 * A photo seen through a rounded window that opens up as it scrolls into
 * view — the public site's signature moment.
 *
 * Driven by native scroll (no scroll-jacking), so it is inherently
 * interruptible: stop or reverse the scroll and the window follows. The
 * scroll value is smoothed by a critically damped spring (no overshoot) so the
 * motion settles rather than stepping. Only `transform` animates. Reduced
 * motion: a still photo.
 */
export default function ScrollWindow({
  src,
  alt,
  priority = false,
  className = "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[2/1]",
  sizes = "100vw",
  objectPosition = "50% 40%",
  from = 0.88,
}: {
  src: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
  objectPosition?: string;
  /** Starting scale of the window (1 = no effect). */
  from?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, mass: 0.6 });
  // Under reduced motion the transforms are pinned at 1 (rather than removed:
  // a removed style would leave the last-applied transform in place).
  const scale = useTransform(smooth, [0, 1], reduce ? [1, 1] : [from, 1]);
  const imageScale = useTransform(smooth, [0, 1], reduce ? [1, 1] : [1.12, 1]);
  const ph = src ? placeholderFor(src) : undefined;

  if (!src) return null;
  return (
    <div ref={ref} className="a-wrap">
      <motion.div
        style={{ scale }}
        className={`a-halo relative w-full overflow-hidden rounded-[var(--a-r-lg)] bg-night will-change-transform ${className}`}
      >
        <motion.div style={{ scale: imageScale }} className="absolute inset-0 will-change-transform">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            placeholder={ph ? "blur" : "empty"}
            blurDataURL={ph?.blur}
            className="object-cover"
            style={{ objectPosition }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
