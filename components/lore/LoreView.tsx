"use client";

// RISHI Lore — the club's history in two views:
//   Lineages   (default)  the bigs/littles family trees (unchanged from the old Lineage page)
//   Leadership            one year's leadership tree at a time
// The view lives in the URL: /dashboard/lore?tab=lineages | ?tab=leadership&year=2024-2025

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Reveal from "@/components/Reveal";
import DashboardBanner from "@/components/DashboardBanner";
import { Segmented } from "@/components/fullDirectory/ui";
import LineagesView from "@/components/lore/LineagesView";
import LeadershipView from "@/components/lore/LeadershipView";

type Tab = "lineages" | "leadership";

export default function LoreView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "leadership" ? "leadership" : "lineages";

  const switchTo = (t: Tab) => {
    if (t === tab) return;
    const q = new URLSearchParams();
    q.set("tab", t);
    if (t === "leadership" && params.get("year")) q.set("year", params.get("year")!);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <>
      <DashboardBanner>
        <div className="container-rishi relative z-10 py-14">
          <Reveal>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-paper/70 transition-colors hover:text-paper"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Back to dashboard
            </Link>
            <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">RISHI Lore</h1>
          </Reveal>
        </div>
      </DashboardBanner>

      {/* A solid paper pill behind the toggle, so it reads over the banner photo
          (Liquid Glass) as well as on the plain page, in light and dark mode. */}
      <div className="container-rishi flex justify-center pb-8 pt-10">
        <div className="rounded-full bg-paper p-1 shadow-[0_6px_20px_-8px_rgb(20_54_40/0.35)] ring-1 ring-pine/10" data-lore-toggle>
        <Segmented<Tab>
          label="Lore view"
          value={tab}
          onChange={switchTo}
          options={[
            { value: "lineages", label: "Lineages" },
            { value: "leadership", label: "Leadership" },
          ]}
        />
        </div>
      </div>

      {tab === "lineages" ? (
        <LineagesView />
      ) : (
        <section className="container-rishi pb-14">
          <LeadershipView />
        </section>
      )}
    </>
  );
}
