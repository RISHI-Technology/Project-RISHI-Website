import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { deleteAnnouncement, getAnnouncementById } from "@/lib/lms/announcements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eq = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const ann = await getAnnouncementById(params.id);
  if (!ann) return NextResponse.json({ ok: true }); // already gone
  // Only the person who created the announcement may delete it.
  if (!eq(ann.authorEmail, me.email))
    return NextResponse.json({ error: "Only the author can delete this announcement." }, { status: 403 });

  await deleteAnnouncement(params.id);
  return NextResponse.json({ ok: true });
}
