
export default function SectionHeading({
  eyebrow,
  title,
  align = "left",
  accent = "marigold",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  align?: "left" | "center";
  accent?: "marigold" | "pine";
  /** "light" = for paper/light sections; "dark" = for pine/dark sections */
  tone?: "light" | "dark";
}) {
  // Public-site section heading (app/site.css type scale). The small all-caps
  // label above it is not drawn; `eyebrow` and
  // `accent` are accepted but no longer drawn, so call sites stay unchanged.
  void eyebrow; void accent;
  const titleColor = tone === "dark" ? "text-snow" : "text-deodar";

  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className={`t-h2 max-w-[22ch] ${align === "center" ? "mx-auto" : ""} ${titleColor}`}>
        {title}
      </h2>
    </div>
  );
}
