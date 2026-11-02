"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NAV } from "@/lib/content";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center" aria-label="Project RISHI home">
      <Image
        src="/images/project-rishi-logo.png"
        alt="Project RISHI"
        width={260}
        height={130}
        priority
        data-logo="light"
        className="h-12 w-auto"
      />
      {/* Same logo with light lettering, shown only in dashboard dark mode. */}
      <Image
        src="/images/project-rishi-logo-dark.png"
        alt="Project RISHI"
        width={260}
        height={130}
        data-logo="dark"
        className="h-12 w-auto"
      />
    </Link>
  );
}

/** The header on /dashboard pages — unchanged, so the member dashboard (and its
 *  Liquid Glass styling, which targets this markup) looks exactly as before. */
function DashboardNavbar() {
  // Menus open and close on springs: a spring reverses from wherever it is
  // (position and speed) if you hover off or tap again mid-way, instead of
  // restarting a fixed-length tween. Reduced motion: they just appear.
  const reduce = useReducedMotion();
  const menuSpring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 600, damping: 42, mass: 0.7 };
  const pathname = usePathname();
  const { status } = useSession();
  const isMember = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setProjOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-pine/10 bg-paper/90 backdrop-blur-md"
      // Height includes the top inset; padding keeps the nav itself below the notch.
      style={{ height: "var(--header-h)", paddingTop: "var(--safe-top)" }}
    >
      <nav className="container-rishi flex h-full items-center justify-between">
        <Wordmark />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setProjOpen(true)}
                onMouseLeave={() => setProjOpen(false)}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-pine"
                      : "text-ink/70 hover:text-pine"
                  }`}
                >
                  {item.label}
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${projOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Link>
                <AnimatePresence>
                  {projOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={menuSpring}
                      className="absolute left-0 top-full w-60 pt-2"
                    >
                      <div className="overflow-hidden rounded-2xl border border-pine/10 bg-paper p-2 shadow-xl shadow-pine/10">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-xl px-4 py-2.5 text-sm transition-colors ${
                              pathname === child.href
                                ? "bg-pine/5 text-pine"
                                : "text-ink/75 hover:bg-pine/5 hover:text-pine"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-pine"
                    : "text-ink/70 hover:text-pine"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
          {isMember && (
            <Link
              href="/dashboard"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive("/dashboard")
                  ? "text-pine"
                  : "text-pine/90 hover:text-pine"
              }`}
            >
              Dashboard
            </Link>
          )}
          <Link href="/apply" className="btn-accent ml-2 px-5 py-2.5 text-sm">
            Join Us
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-10 w-10 place-items-center rounded-full text-pine lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <div className="relative h-4 w-6">
            <span
              className={`absolute left-0 h-0.5 w-6 bg-current transition-all duration-300 ${
                mobileOpen ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-6 bg-current transition-all duration-300 ${
                mobileOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-6 bg-current transition-all duration-300 ${
                mobileOpen ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={menuSpring}
            className="overflow-hidden border-t border-pine/10 bg-paper lg:hidden"
          >
            <div className="container-rishi flex flex-col gap-1 py-4">
              {NAV.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-3 py-2.5 text-base font-medium text-ink/80"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="ml-3 border-l border-pine/15 pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block rounded-xl px-3 py-2 text-sm text-ink/65"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isMember && (
                <Link
                  href="/dashboard"
                  className="block rounded-xl px-3 py-2.5 text-base font-semibold text-pine"
                >
                  Dashboard
                </Link>
              )}
              <Link href="/apply" className="btn-accent mt-3 w-full">
                Join Us
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/** The public website's header: a Liquid Glass bar (the floating functional
 *  layer) with the same links, Projects menu, mobile menu, member Dashboard
 *  link and Join Us action as before. */
function SiteNavbar() {
  const reduce = useReducedMotion();
  // Critically damped (no overshoot) — a menu that simply appeared shouldn't
  // bounce. Springs retarget from wherever they are, so hovering off mid-open
  // reverses smoothly instead of finishing first.
  const spring = reduce ? { duration: 0.15 } : { type: "spring" as const, bounce: 0, duration: 0.35 };
  const pathname = usePathname();
  const { status } = useSession();
  const isMember = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setProjOpen(false);
  }, [pathname]);

  // Scroll edge: the hairline appears only once content is actually under the bar.
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const linkCls = (active: boolean) =>
    `inline-flex min-h-[44px] items-center gap-1 rounded-full px-3.5 text-[0.9375rem] tracking-[-0.01em] transition-colors duration-150 ${
      active ? "font-semibold text-label" : "font-medium text-label/70 hover:text-label"
    }`;

  return (
    <header
      className={`site a-glass fixed inset-x-0 top-0 z-50 transition-shadow duration-200 ${
        scrolled || mobileOpen ? "shadow-[inset_0_-0.5px_0_rgb(var(--a-label)/0.16)]" : ""
      }`}
      style={{ height: "var(--header-h)", paddingTop: "var(--safe-top)" }}
    >
      <nav className="a-wrap flex h-full items-center justify-between">
        <Wordmark />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setProjOpen(true)}
                onMouseLeave={() => setProjOpen(false)}
              >
                <Link href={item.href} className={linkCls(isActive(item.href))} aria-expanded={projOpen}>
                  {item.label}
                  <motion.svg
                    animate={{ rotate: projOpen ? 180 : 0 }}
                    transition={spring}
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </motion.svg>
                </Link>
                <AnimatePresence>
                  {projOpen && (
                    <motion.div
                      // Grows out of its trigger (origin top-left), materialising
                      // with scale + blur together rather than a plain fade.
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6, filter: "blur(6px)" }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6, filter: "blur(6px)" }}
                      transition={spring}
                      style={{ transformOrigin: "24px 0px" }}
                      className="absolute left-0 top-full w-64 pt-2"
                    >
                      <div className="a-glass-menu overflow-hidden rounded-[var(--a-r-md)] p-1.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex min-h-[44px] items-center rounded-[12px] px-3.5 text-[0.9375rem] tracking-[-0.01em] transition-colors duration-150 active:bg-label/[0.08] ${
                              pathname === child.href
                                ? "bg-label/[0.06] font-semibold text-label"
                                : "text-label/80 hover:bg-label/[0.05] hover:text-label"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={linkCls(isActive(item.href))}>
                {item.label}
              </Link>
            )
          )}
          {isMember && (
            <Link href="/dashboard" className={linkCls(isActive("/dashboard"))}>
              Dashboard
            </Link>
          )}
          <Link href="/apply" className="a-btn a-btn-primary ml-3 min-h-[40px] px-5 text-[0.9375rem]">
            Join Us
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-11 w-11 place-items-center rounded-full text-label transition-[background-color,transform] duration-150 active:scale-95 active:bg-label/[0.06] lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <div className="relative h-4 w-6">
            <span className={`absolute left-0 h-[2px] w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 top-1.5 h-[2px] w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`absolute left-0 h-[2px] w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? "top-1.5 -rotate-45" : "top-3"}`} />
          </div>
        </button>
      </nav>

      {/* Mobile menu — drops from the bar and returns the same way. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="a-glass-menu overflow-hidden lg:hidden"
          >
            <div className="a-wrap flex flex-col py-3">
              {NAV.map((item) => (
                <div key={item.label}>
                  <Link href={item.href} className="flex min-h-[48px] items-center text-[1.75rem] font-semibold tracking-[-0.025em] text-label">
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="pb-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex min-h-[44px] items-center text-[1.0625rem] text-label/70"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isMember && (
                <Link href="/dashboard" className="flex min-h-[48px] items-center text-[1.75rem] font-semibold tracking-[-0.025em] text-label">
                  Dashboard
                </Link>
              )}
              <Link href="/apply" className="a-btn a-btn-primary mb-2 mt-4 w-full">
                Join Us
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function Navbar() {
  const pathname = usePathname() ?? "";
  return pathname.startsWith("/dashboard") ? <DashboardNavbar /> : <SiteNavbar />;
}
