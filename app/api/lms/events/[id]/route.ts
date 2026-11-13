import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { allowedEventScopes, canManageEvent, canTargetMembers, targetableGroups } from "@/lib/lms/permissions";
import { deleteEvent, getEvent, setEventArchived, updateEvent } from "@/lib/lms/store";
import { notifyEventRemoved } from "@/lib/lms/notify";
import type { ProjectGroup } from "@/lib/lms/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const event = await getEvent(params.id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!canManageEvent(me, event))
    return NextResponse.json({ error: "You can't edit this event." }, { status: 403 });

  if (body.action === "archive" || body.action === "unarchive") {
    return NextResponse.json({ event: await setEventArchived(event.id, body.action === "archive") });
  }

  const title = String(body.title ?? "").trim();
  const startAt = String(body.startAt ?? "");
  const scopeKind = body.scopeKind as typeof event.scopeKind;
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (!startAt) return NextResponse.json({ error: "A start time is required." }, { status: 400 });

  if (!allowedEventScopes(me).includes(scopeKind))
    return NextResponse.json({ error: "You can't use that audience." }, { status: 403 });
  const scopeGroups = (body.scopeGroups ?? []) as ProjectGroup[];
  if (scopeKind === "group") {
    const allowed = targetableGroups(me);
    if (scopeGroups.length === 0 || scopeGroups.some((g) => !allowed.includes(g)))
      return NextResponse.json({ error: "You can't target those groups." }, { status: 403 });
  }
  const scopeEmails = Array.isArray(body.scopeEmails) ? (body.scopeEmails as string[]) : [];
  if (scopeKind === "members") {
    if (scopeEmails.length === 0)
      return NextResponse.json({ error: "Pick at least one member." }, { status: 400 });
    if (!canTargetMembers(me, scopeEmails))
      return NextResponse.json(
        { error: "You can only create events for members of your own project group." },
        { status: 403 }
      );
  }

  const updated = await updateEvent(event.id, {
    title,
    description: String(body.description ?? "").trim(),
    startAt,
    endAt: (body.endAt as string) ?? null,
    allDay: Boolean(body.allDay),
    scopeKind,
    scopeEmails,
    scopeGroups,
  });
  return NextResponse.json({ event: updated });
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const event = await getEvent(params.id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!canManageEvent(me, event))
    return NextResponse.json({ error: "You can't delete this event." }, { status: 403 });
  await deleteEvent(event.id);
  await notifyEventRemoved(event).catch(() => {});
  return NextResponse.json({ ok: true });
}
