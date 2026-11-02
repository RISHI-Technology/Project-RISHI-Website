import type { ReactNode } from "react";

/**
 * Small marker label for the public site: a short marigold line followed by a
 * line of sentence-case text. Used for page and hero labels, never on every heading.
 */
export default function SiteLabel({
  children,
  tone = "light",
}: {
  children: ReactNode;
  /** "light" = on white/mist surfaces; "dark" = on deodar (green) surfaces */
  tone?: "light" | "dark";
}) {
  return (
    <span className={`t-label inline-flex items-center gap-3 ${tone === "dark" ? "text-snow/80" : "text-stone"}`}>
      <span className="s-mark" aria-hidden />
      {children}
    </span>
  );
}
