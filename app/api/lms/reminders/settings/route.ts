import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { findMember, memberFullName, type Member } from "@/lib/members";
import {
  BEFORE_KEYS, BEFORE_LABELS, OVERDUE_KEYS, OVERDUE_LABELS, STANDARD_PREFS,
  canEditReminders, cleanPrefs, clearDefaultPrefs, clearMemberPrefs, effectivePrefs,
  loadReminderSettings, managedScopes, nameOrEmail, scopeDefault, scopeLabel, scopeMembers, scopeTeamLabel,
  setDefaultPrefs, setMemberPrefs, type ReminderSettings, type ScopeId,
} from "@/lib/lms/reminderPrefs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reminder settings for tasks YOUR TEAM assigns (see lib/lms/reminderPrefs.ts).
 *   GET → each team you're on, with its default and every member's current
 *         setting for that team's tasks (and who last changed it).
 *   PUT → change one thing, then returns the same shape as GET:
 *         { scope, email, prefs }   a member's setting (prefs: null = back to the team default)
 *         { scope, prefs }          the team default (prefs: null = back to the standard default)
 *         { scope, resetMembers }   put everyone back on the team default
 * Everyone on a team (co-leads etc.) sees and edits the same values.
 */

function payload(me: Member, settings: ReminderSettings) {
  const sourceLabel = (s: ReturnType<typeof effectivePrefs>["source"]) =>
    s === "member" ? "Custom" : s === "standard" ? "Standard" : "Team default";
  return {
    options: {
      before: BEFORE_KEYS.map((key) => ({ key, label: BEFORE_LABELS[key] })),
      overdue: OVERDUE_KEYS.map((key) => ({ key, label: OVERDUE_LABELS[key] })),
    },
    standard: STANDARD_PREFS,
    scopes: managedScopes(me).map((scope) => {
      const d = scopeDefault(settings, scope);
      return {
        id: scope,
        label: scopeLabel(scope),
        team: scopeTeamLabel(scope),
        default: {
          prefs: d.prefs,
          custom: !!d.stored,
          updatedAt: d.stored?.updatedAt ?? null,
          updatedBy: d.stored ? nameOrEmail(d.stored.updatedBy) : null,
        },
        members: scopeMembers(scope, me).map((m) => {
          const e = effectivePrefs(settings, scope, m.email);
          return {
            email: m.email.toLowerCase(),
            name: memberFullName(m),
            prefs: e.prefs,
            source: e.source,
            sourceLabel: sourceLabel(e.source),
            custom: e.source === "member",
            updatedAt: e.stored?.updatedAt ?? null,
            updatedBy: e.stored ? nameOrEmail(e.stored.updatedBy) : null,
          };
        }),
      };
    }),
  };
}

async function gate() {
  const me = await getCurrentMember();
  if (!me) return { error: "Not authorized", status: 401 as const };
  if (managedScopes(me).length === 0) return { error: "Only people who can assign tasks manage reminders.", status: 403 as const };
  return { me };
}

export async function GET() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  // Members who can't assign tasks get an empty list (the panel then renders
  // nothing) rather than a 403 their browser console would log on every visit.
  if (managedScopes(me).length === 0) return NextResponse.json({ ...payload(me, new Map()), scopes: [] });
  return NextResponse.json(payload(me, await loadReminderSettings()));
}

export async function PUT(req: Request) {
  const g = await gate();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });
  const me = g.me;

  let body: { email?: unknown; scope?: unknown; prefs?: unknown; resetMembers?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const prefs = body.prefs === null ? null : cleanPrefs(body.prefs);
  if (body.prefs !== null && body.prefs !== undefined && !prefs)
    return NextResponse.json({ error: "Those reminder settings aren't valid." }, { status: 400 });

  if (typeof body.scope !== "string" || !managedScopes(me).includes(body.scope as ScopeId))
    return NextResponse.json({ error: "You don't manage that group." }, { status: 403 });
  const scope = body.scope as ScopeId;

  if (typeof body.email === "string") {
    const target = findMember(body.email);
    if (!target || !canEditReminders(me, scope, target))
      return NextResponse.json({ error: "You can't change reminders for that member." }, { status: 403 });
    if (body.prefs === undefined) return NextResponse.json({ error: "Missing prefs." }, { status: 400 });
    if (prefs) await setMemberPrefs(scope, target.email, prefs, me.email);
    else await clearMemberPrefs(scope, [target.email], me.email);
  } else {
    if (body.resetMembers === true) {
      const current = await loadReminderSettings();
      const own = scopeMembers(scope, me).filter((m) => effectivePrefs(current, scope, m.email).source === "member");
      await clearMemberPrefs(scope, own.map((m) => m.email), me.email);
    } else if (body.prefs !== undefined) {
      if (prefs) await setDefaultPrefs(scope, prefs, me.email);
      else await clearDefaultPrefs(scope, me.email);
    } else {
      return NextResponse.json({ error: "Missing prefs." }, { status: 400 });
    }
  }

  return NextResponse.json(payload(me, await loadReminderSettings()));
}
