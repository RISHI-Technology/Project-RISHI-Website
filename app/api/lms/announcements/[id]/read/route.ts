import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { setAnnouncementRead } from "@/lib/lms/announcements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  let body: { read?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const read = body.read !== false; // default to marking read
  await setAnnouncementRead(params.id, me.email, read);
  return NextResponse.json({ ok: true, read });
}
