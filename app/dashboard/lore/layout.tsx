import { getCurrentMember } from "@/lib/lms/currentUser";
import LockedFeature from "@/components/LockedFeature";

export const dynamic = "force-dynamic";

/** RISHI Lore (Lineages + Leadership) is for members in a project group — the same
 *  rule the old Lineage page had. New members (no group yet) see a locked notice
 *  instead — checked on the server, so the page never loads. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentMember();
  if (me && me.group === null) return <LockedFeature name="RISHI Lore" />;
  return <>{children}</>;
}
