"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Dashboard interface style: "glass" (Liquid Glass, the default) or "classic".
 *
 * Stored per browser (localStorage "rishi:ui"), like dark mode. Only an explicit
 * "classic" opts out, so every member starts on Liquid Glass.
 *
 * While a dashboard page is open, <DashboardGlass/> puts the `glass` class on
 * <html>; a tiny script in the root layout does the same before first paint so
 * there's no flash of the classic look. All of the styling lives in
 * app/glass-theme.css and is keyed on that class, so Classic is exactly the
 * dashboard as it was. RISHI AI (/dashboard/ask) has its own full-screen theme
 * and is left alone.
 */
export const UI_KEY = "rishi:ui";
const EVENT = "rishi-ui-change";

export type UiStyle = "glass" | "classic";

export function readUi(): UiStyle {
  try { return window.localStorage.getItem(UI_KEY) === "classic" ? "classic" : "glass"; } catch { return "glass"; }
}

/** Pages that get the glass treatment (keep in step with the script in app/layout.tsx). */
export const isGlassPath = (p: string | null) =>
  !!p && p.startsWith("/dashboard") && !p.startsWith("/dashboard/ask");

function setUi(v: UiStyle) {
  try { window.localStorage.setItem(UI_KEY, v); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

/** The member's chosen interface style, live. null until it's been read (just
 *  after mount) — until then the pre-paint script's class on <html> stands, so
 *  nothing should act on a guess. */
export function useUiStyle(): UiStyle | null {
  const [ui, set] = useState<UiStyle | null>(null);
  useEffect(() => {
    set(readUi());
    const on = (e: Event) => set((e as CustomEvent).detail);
    const onStorage = (e: StorageEvent) => { if (e.key === UI_KEY) set(readUi()); }; // other tabs
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener("storage", onStorage); };
  }, []);
  return ui;
}

/** Is the glass interface showing on this page right now? (null = not known yet) */
export function useGlass(): boolean | null {
  const ui = useUiStyle();
  const pathname = usePathname();
  if (ui === null) return null;
  return ui === "glass" && isGlassPath(pathname);
}

/**
 * Keeps <html class="glass"> in step with the choice and the current page, and
 * drives the light that follows the pointer across glass ([data-glass-light]).
 */
export function DashboardGlass() {
  const on = useGlass();

  useEffect(() => {
    if (on === null) return; // not read yet: leave the pre-paint class alone
    document.documentElement.classList.toggle("glass", on);
  }, [on]);
  // Leaving the dashboard altogether: the public site never sees the class.
  useEffect(() => () => {
    document.documentElement.classList.remove("glass");
    document.documentElement.removeAttribute("data-glass-scrolled");
  }, []);

  // The header is clear glass with white navigation while it sits on the
  // picture, and turns frosted-light (normal dark navigation) once the welcome
  // banner has scrolled up under it — like glass adapting to what's beneath.
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (on === null) return;
    if (!on) { root.removeAttribute("data-glass-scrolled"); return; }
    let frame = 0;
    const check = () => {
      frame = 0;
      const hero = document.querySelector(".dash-shell > :is([data-dashboard-banner], [data-glass-hero])");
      const header = document.querySelector("body > header") as HTMLElement | null;
      const over = hero ? hero.getBoundingClientRect().bottom <= (header?.offsetHeight ?? 76) : true;
      root.toggleAttribute("data-glass-scrolled", over);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [on, pathname]);

  // Specular light: the element under a fine pointer gets --gx/--gy so its sheen
  // sits where the light "hits". One passive listener, at most one write per frame.
  useEffect(() => {
    if (!on) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const el = (e.target as Element | null)?.closest?.("[data-glass-light]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${e.clientX - r.left}px`);
      el.style.setProperty("--gy", `${e.clientY - r.top}px`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => { document.removeEventListener("pointermove", move); if (frame) cancelAnimationFrame(frame); };
  }, [on]);

  return null;
}

/** Settings: choose between Liquid Glass and Classic, with a small preview of each. */
export function InterfaceSetting() {
  const ui = useUiStyle();
  const options: { id: UiStyle; name: string; note: string }[] = [
    { id: "glass", name: "Liquid Glass", note: "Your banner fills the screen behind frosted panels" },
    { id: "classic", name: "Classic", note: "The original layout on a plain page" },
  ];
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-pine/15 bg-pine/[0.03] p-6">
      <h2 className="font-display text-lg font-semibold text-pine-deep">Interface</h2>
      <p className="mt-1 text-sm text-ink/75">How the dashboard looks in this browser. Your banner choice carries over to both.</p>
      <div role="radiogroup" aria-label="Interface style" className="mt-4 grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = ui === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              onClick={() => setUi(o.id)}
              className={`group flex flex-col justify-start rounded-2xl p-2 text-left transition-[box-shadow,transform] duration-100 active:scale-[0.98] ${
                active ? "ring-2 ring-marigold" : "ring-1 ring-ink/10 hover:ring-pine/40"
              }`}
            >
              <InterfacePreview kind={o.id} />
              <span className="mt-2 block px-1 text-sm font-semibold text-ink">{o.name}</span>
              <span className="block px-1 pb-1 text-xs text-ink/70">{o.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Miniature of each look. Fixed colours on purpose: it's a picture of the
   interface, so it shouldn't change with the theme it sits in. */
function InterfacePreview({ kind }: { kind: UiStyle }) {
  if (kind === "glass") {
    return (
      <span data-theme-fixed className="relative block aspect-[16/10] overflow-hidden rounded-xl" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 40%" }} />
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,18,13,0.35), rgba(6,18,13,0.15))" }} />
        <span className="absolute left-[9%] top-[14%] h-[7%] w-[38%] rounded-full bg-white/85" />
        <span
          className="absolute inset-x-[7%] bottom-[8%] top-[36%] rounded-lg"
          style={{
            background: "rgba(251,248,241,0.55)",
            backdropFilter: "blur(6px) saturate(160%)",
            WebkitBackdropFilter: "blur(6px) saturate(160%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 6px 14px rgba(6,18,13,0.25)",
          }}
        >
          <span className="absolute left-[6%] top-[14%] h-[30%] w-[27%] rounded-md bg-white/60" />
          <span className="absolute left-[37%] top-[14%] h-[30%] w-[27%] rounded-md bg-white/60" />
          <span className="absolute left-[68%] top-[14%] h-[30%] w-[26%] rounded-md bg-white/60" />
          <span className="absolute inset-x-[6%] bottom-[14%] h-[24%] rounded-md bg-white/45" />
        </span>
      </span>
    );
  }
  return (
    <span data-theme-fixed className="relative block aspect-[16/10] overflow-hidden rounded-xl bg-[#FBF8F1]" aria-hidden>
      <span className="absolute inset-x-0 top-0 h-[34%] bg-[#1E4D3A]" />
      <span className="absolute left-[9%] top-[13%] h-[7%] w-[38%] rounded-full bg-[#FBF8F1]/85" />
      <span className="absolute left-[7%] top-[44%] h-[22%] w-[26%] rounded-md border border-[#1E4D3A]/15 bg-[#1E4D3A]/[0.04]" />
      <span className="absolute left-[37%] top-[44%] h-[22%] w-[26%] rounded-md border border-[#1E4D3A]/15 bg-[#1E4D3A]/[0.04]" />
      <span className="absolute left-[67%] top-[44%] h-[22%] w-[26%] rounded-md border border-[#1E4D3A]/15 bg-[#1E4D3A]/[0.04]" />
      <span className="absolute inset-x-[7%] bottom-[9%] h-[17%] rounded-md border border-[#1E4D3A]/15 bg-[#1E4D3A]/[0.04]" />
    </span>
  );
}
