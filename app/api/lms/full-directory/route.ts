import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { listFullDirectory } from "@/lib/fullDirectory/store";
import type { FullDirectoryResponse } from "@/lib/fullDirectory/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

// The Full Directory (every member, 2015–2027). Any signed-in member can view it;
// phone numbers and non-@berkeley.edu emails are included only for exec and the
// webmaster, and are stripped server-side for everyone else.
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: NO_STORE });

  const canSeePrivate = !!(me.roles.exec || me.roles.webmaster);
  try {
    const people = await listFullDirectory(canSeePrivate);
    const body: FullDirectoryResponse = { people, canSeePrivate };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Tables not created yet → a clear message instead of a raw DB error.
    if (/directory_people|directory_memberships|schema cache/i.test(msg))
      return NextResponse.json({ error: "The Full Directory hasn't been set up yet.", notReady: true }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ error: "Couldn't load the Full Directory." }, { status: 500, headers: NO_STORE });
  }
}
