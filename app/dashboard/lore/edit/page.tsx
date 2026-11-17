import Link from "next/link";
import { Suspense } from "react";
import { getCurrentMember } from "@/lib/lms/currentUser";
import LeadershipEditor from "@/components/lore/LeadershipEditor";

export const dynamic = "force-dynamic";

/** Webmaster-only editor for Lore → Leadership. Checked on the server (the same
 *  roles.webmaster check as every webmaster tool); the API enforces it again. */
export default async function LoreEditPage() {
  const me = await getCurrentMember();
  if (!me?.roles.webmaster) {
    return (
      <section className="pt-[var(--header-h)]">
        <div className="container-rishi grid min-h-[60vh] place-items-center py-16">
          <div data-editor-denied className="max-w-md rounded-3xl border border-pine/15 bg-pine/[0.03] p-8 text-center">
            <h1 className="font-display text-2xl font-semibold text-pine-deep">Webmasters only</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">Only the webmaster can edit leadership history.</p>
            <Link href="/dashboard/lore?tab=leadership" className="btn-primary mt-6 inline-flex text-sm">Back to Lore</Link>
          </div>
        </div>
      </section>
    );
  }
  return (
    <Suspense fallback={null}>
      <LeadershipEditor />
    </Suspense>
  );
}
