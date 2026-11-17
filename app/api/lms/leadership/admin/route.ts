import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import {
  LeadershipInputError, applyOp, getLeadershipData, isNotReady, listDirectoryPeople, parseOp,
} from "@/lib/leadership/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Webmaster only — the same check every webmaster tool makes (roles.webmaster). */
async function gate() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: NO_STORE });
  if (!me.roles.webmaster) return NextResponse.json({ error: "Webmaster only." }, { status: 403, headers: NO_STORE });
  return null;
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
  const denied = await gate();
  if (denied) return denied;
  try {
    return NextResponse.json({ people: await listDirectoryPeople() }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}

/** One edit ({ op, ... }; see LeadershipOp). Responds with everything, read back fresh. */
export async function POST(req: Request) {
  const denied = await gate();
  if (denied) return denied;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400, headers: NO_STORE }); }
  try {
    await applyOp(parseOp(body));
    return NextResponse.json(await getLeadershipData(true), { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}
