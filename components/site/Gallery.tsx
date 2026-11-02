"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal gallery. Scrolling is the browser's own — trackpad and touch get
 * the platform's momentum, snapping and rubber-banding, and the keyboard can
 * reach every card — with round previous/next buttons for mouse users that
 * dim at either end.
 */
export default function Gallery({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const amount = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * amount, behavior: reduce ? "auto" : "smooth" });
  };

  const btn = tone === "dark"
    ? "bg-white/15 text-white hover:bg-white/25 disabled:bg-white/5 disabled:text-white/30"
    : "bg-label/[0.08] text-label hover:bg-label/[0.14] disabled:bg-label/[0.04] disabled:text-label/30";

  return (
    <div>
      <div ref={ref} className="a-gallery">
        {children}
      </div>
      <div className="a-wrap mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={atStart}
          aria-label="Previous"
          className={`grid h-11 w-11 place-items-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95 disabled:cursor-default disabled:active:scale-100 ${btn}`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={atEnd}
          aria-label="Next"
          className={`grid h-11 w-11 place-items-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95 disabled:cursor-default disabled:active:scale-100 ${btn}`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
