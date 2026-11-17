import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import {
  LeadershipInputError, applyOp, getLeadershipData, isNotReady, listDirectoryPeople, parseOp, type Viewer,
} from "@/lib/leadership/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Webmaster only — the same check every webmaster tool makes (roles.webmaster). */
async function gate(): Promise<{ denied: NextResponse } | { viewer: Viewer }> {
  const me = await getCurrentMember();
  if (!me) return { denied: NextResponse.json({ error: "Not authorized" }, { status: 401, headers: NO_STORE }) };
  if (!me.roles.webmaster) return { denied: NextResponse.json({ error: "Webmaster only." }, { status: 403, headers: NO_STORE }) };
  return { viewer: { email: me.email, name: `${me.firstName} ${me.lastName}` } };
}

function failure(e: unknown) {
  if (e instanceof LeadershipInputError) return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
  if (isNotReady(e))
    return NextResponse.json({ error: "Leadership history hasn't been set up yet (run migration-leadership.sql).", notReady: true }, { status: 503, headers: NO_STORE });
  console.error("[leadership/admin]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "Couldn't save that. Nothing was changed." }, { status: 500, headers: NO_STORE });
}

/** The Full Directory, light (id, name, slug, years) — for the editor's link picker. */
export async function GET() {
  const g = await gate();
  if ("denied" in g) return g.denied;
  try {
    return NextResponse.json({ people: await listDirectoryPeople() }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}

/** One edit ({ op, ... }; see LeadershipOp). Responds with everything, read back fresh. */
export async function POST(req: Request) {
  const g = await gate();
  if ("denied" in g) return g.denied;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400, headers: NO_STORE }); }
  try {
    await applyOp(parseOp(body));
    return NextResponse.json(await getLeadershipData(true, g.viewer), { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}
