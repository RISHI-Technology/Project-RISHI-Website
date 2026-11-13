import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { deleteNewsletter, getNewsletterById } from "@/lib/lms/newsletters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eq = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const nl = await getNewsletterById(params.id);
  if (!nl) return NextResponse.json({ ok: true });
  if (!eq(nl.authorEmail, me.email))
    return NextResponse.json({ error: "Only the author can delete this newsletter." }, { status: 403 });
  await deleteNewsletter(params.id);
  return NextResponse.json({ ok: true });
}
