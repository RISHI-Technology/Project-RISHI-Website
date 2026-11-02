
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
  // Section headings stand on their own: the small all-caps label above them
  // now appears only once per page, in the page's hero. `eyebrow` and
  // `accent` are accepted but no longer drawn, so call sites stay unchanged.
  void eyebrow; void accent;
  const titleColor = tone === "dark" ? "text-white" : "text-label";

  // Public-site section headline (app/site.css type scale).
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className={`a-headline ${align === "center" ? "mx-auto" : ""} max-w-[20ch] ${titleColor}`}>
        {title}
      </h2>
    </div>
  );
}
