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
  // Section headings stand on their own: no small all-caps label above them.
  // `eyebrow` and `accent` are accepted but not drawn, so call sites stay
  // unchanged.
  void eyebrow; void accent;
  const titleColor = tone === "dark" ? "text-paper" : "text-pine-deep";

  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className={`font-display text-[2.25rem] font-semibold leading-[1.08] sm:text-5xl sm:leading-[1.04] ${titleColor}`}>
        {title}
      </h2>
    </div>
  );
}
