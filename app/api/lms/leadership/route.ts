import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { getLeadershipData, isNotReady } from "@/lib/leadership/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Lore → Leadership: every year's leadership tree plus the Full Directory facts the
// person popup shows. Same lock as Lore itself: members placed in a project group
// (new members see Lore locked). The directory facts here are a subset of what the
// Full Directory already shows every signed-in member.
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: NO_STORE });
  if (me.group === null) return NextResponse.json({ error: "Unlocks once you're placed in a project group." }, { status: 403, headers: NO_STORE });
  try {
    return NextResponse.json(await getLeadershipData(Boolean(me.roles.webmaster)), { headers: NO_STORE });
  } catch (e) {
    if (isNotReady(e))
      return NextResponse.json({ error: "Leadership history hasn't been set up yet.", notReady: true }, { status: 503, headers: NO_STORE });
    console.error("[leadership] load failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't load leadership history." }, { status: 500, headers: NO_STORE });
  }
}
