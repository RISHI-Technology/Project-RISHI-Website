"use client";

import Link from "next/link";

/**
 * Member Directory's two views: "Current Members" (the existing directory) and
 * "Full Directory" (everyone, 2015–2027). Real links (?view=full), so each view
 * can be shared, bookmarked and survives a refresh. Sits on the dark banner.
 */
export default function ViewSwitcher({ active }: { active: "current" | "full" }) {
  const item = (key: "current" | "full", href: string, label: string, sub: string) => {
    const on = key === active;
    return (
      <Link
        href={href}
        replace
        scroll={false}
        aria-current={on ? "page" : undefined}
        className={`inline-flex items-baseline gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
          on ? "bg-marigold text-pine-deep shadow-sm" : "text-paper/80 hover:bg-paper/10 hover:text-paper"
        }`}
      >
        {label}
        <span className={`hidden text-xs font-medium sm:inline ${on ? "text-pine-deep/70" : "text-paper/55"}`}>{sub}</span>
      </Link>
    );
  };
  return (
    <nav
      aria-label="Directory views"
      data-glass="clear"
      className="mt-6 inline-flex rounded-full border border-paper/25 bg-ink/20 p-1 backdrop-blur-sm"
    >
      {item("current", "/dashboard/directory", "Current Members", "This year")}
      {item("full", "/dashboard/directory?view=full", "Full Directory", "2015–2027")}
    </nav>
  );
}
