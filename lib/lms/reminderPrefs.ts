// ============================================================================
//  Reminder preferences — how often members get automatic task reminders
// ----------------------------------------------------------------------------
//  Settings belong to the TEAM THAT ASSIGNED THE TASK. Each team manages the
//  members it can assign tasks to (the same rules as canAssignTaskTo in
//  lib/lms/permissions.ts), one member at a time or with a team default:
//    group:<E|R|W|H>   that project group's leads    → members of the group
//    newbies           NMT leaders                   → newbies
//    interns:<Type>    that intern kind's supervisors → those interns
//    club              VPs / President               → everyone
//  Everyone on a team shares its settings (co-leads, co-NMT leaders, …), so
//  they all see and edit the same values.
//
//  A task follows ONLY its assigning team's settings: what NMT leaders or a VP
//  change never affects tasks a lead assigned, and vice versa. For a task:
//    that team's setting for the assignee > that team's default > STANDARD_PREFS.
//  Which team assigned a task is worked out from the assigner's role that lets
//  them assign to that assignee (taskScope below).
//
//  Stored in lms_settings (no extra table):
//    reminders:member:<scope>:<email>  one member's setting for that team's tasks
//    reminders:default:<scope>         that team's default
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MEMBERS, canSeeMember, findMember, memberFullName, memberInterns, type Member } from "@/lib/members";
import { supervisedInternTypes } from "@/lib/lms/permissions";
import { PROJECT_GROUP_LABELS, type InternType, type ProjectGroup } from "@/lib/lms/types";

/** Reminders before the due time. Nothing earlier than a day before. */
export const BEFORE_KEYS = ["1d", "6h", "3h", "1h"] as const;
export type BeforeKey = (typeof BEFORE_KEYS)[number];
export const BEFORE_LABELS: Record<BeforeKey, string> = { "1d": "1 day", "6h": "6 hours", "3h": "3 hours", "1h": "1 hour" };

/** How often reminders repeat once a task is overdue. */
export const OVERDUE_KEYS = ["daily", "2d", "weekly", "off"] as const;
export type OverdueKey = (typeof OVERDUE_KEYS)[number];
export const OVERDUE_LABELS: Record<OverdueKey, string> = { daily: "Daily", "2d": "Every 2 days", weekly: "Weekly", off: "Off" };
export const OVERDUE_EVERY_DAYS: Record<Exclude<OverdueKey, "off">, number> = { daily: 1, "2d": 2, weekly: 7 };

export type ReminderPrefs = { before: BeforeKey[]; overdue: OverdueKey };

/** The defaults until a team changes something: 1 day and 1 hour before.
 *  Teams can add the 6-hour and 3-hour reminders per member or as a default. */
export const STANDARD_PREFS: ReminderPrefs = { before: ["1d", "1h"], overdue: "daily" };

type Stored = { prefs: ReminderPrefs; updatedAt: string; updatedBy: string };
export type ReminderSettings = Map<string, Stored>; // lms_settings key → value

export type ScopeId = "club" | `group:${ProjectGroup}` | "newbies" | `interns:${InternType}`;
const PREFIX = "reminders:";
const memberKey = (scope: ScopeId, email: string) => `${PREFIX}member:${scope}:${email.trim().toLowerCase()}`;
const defaultKey = (scope: ScopeId) => `${PREFIX}default:${scope}`;

/** Accepts only known values; returns null for anything malformed. */
export function cleanPrefs(input: unknown): ReminderPrefs | null {
  if (!input || typeof input !== "object") return null;
  const o = input as { before?: unknown; overdue?: unknown };
  if (!Array.isArray(o.before) || typeof o.overdue !== "string") return null;
  if (!o.before.every((k) => (BEFORE_KEYS as readonly string[]).includes(k as string))) return null;
  if (!(OVERDUE_KEYS as readonly string[]).includes(o.overdue)) return null;
  const before = BEFORE_KEYS.filter((k) => (o.before as string[]).includes(k)); // de-duplicated, fixed order
  return { before, overdue: o.overdue as OverdueKey };
}

// ------------------------------------------------------------------- storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// In-memory fallback so local/demo runs without Supabase still behave.
const mem: ReminderSettings = new Map();

function parseStored(raw: string): Stored | null {
  try {
    const v = JSON.parse(raw) as { prefs?: unknown; updatedAt?: unknown; updatedBy?: unknown };
    const prefs = cleanPrefs(v.prefs);
    if (!prefs || typeof v.updatedAt !== "string") return null;
    return { prefs, updatedAt: v.updatedAt, updatedBy: typeof v.updatedBy === "string" ? v.updatedBy : "" };
  } catch {
    return null;
  }
}

/** Every reminder setting, in one read (the cron uses this once per run). */
export async function loadReminderSettings(): Promise<ReminderSettings> {
  if (!usingSupabase) return new Map(mem);
  const { data, error } = await sb().from("lms_settings").select("key,value").like("key", `${PREFIX}%`);
  if (error) throw new Error(error.message);
  const out: ReminderSettings = new Map();
  for (const row of data ?? []) {
    const s = parseStored(row.value as string);
    if (s) out.set(row.key as string, s);
  }
  return out;
}

async function put(key: string, prefs: ReminderPrefs, byEmail: string): Promise<void> {
  const stored: Stored = { prefs, updatedAt: new Date().toISOString(), updatedBy: byEmail.trim().toLowerCase() };
  if (!usingSupabase) { mem.set(key, stored); return; }
  const { error } = await sb().from("lms_settings").upsert(
    { key, value: JSON.stringify(stored), updated_at: stored.updatedAt },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

async function remove(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (!usingSupabase) { keys.forEach((k) => mem.delete(k)); return; }
  const { error } = await sb().from("lms_settings").delete().in("key", keys);
  if (error) throw new Error(error.message);
}

export const setMemberPrefs = (scope: ScopeId, email: string, prefs: ReminderPrefs, by: string) =>
  put(memberKey(scope, email), prefs, by);
export const clearMemberPrefs = (scope: ScopeId, emails: string[]) => remove(emails.map((e) => memberKey(scope, e)));
export const setDefaultPrefs = (scope: ScopeId, prefs: ReminderPrefs, by: string) => put(defaultKey(scope), prefs, by);
export const clearDefaultPrefs = (scope: ScopeId) => remove([defaultKey(scope)]);

// ---------------------------------------------------------------- resolution
/** Which team's settings a task follows: the assigner's role that lets them
 *  assign to this assignee. A lead assigning within their own group counts as
 *  the lead team even if they also hold another role (project work first);
 *  then NMT leader → newbie, supervisor → their intern, then VP/President.
 *  null (assigner gone, or no such role any more) → the standard defaults. */
export function taskScope(assigner: Member | null | undefined, assignee: Member | null | undefined): ScopeId | null {
  if (!assigner || !assignee) return null;
  if (assigner.roles.lead && assigner.group && assignee.group === assigner.group) return `group:${assigner.group}`;
  if (assigner.roles.nmtLeader && assignee.roles.newbie) return "newbies";
  const mine = supervisedInternTypes(assigner);
  const kind = memberInterns(assignee).find((t) => mine.includes(t));
  if (kind) return `interns:${kind}`;
  if (assigner.roles.vpp) return "club";
  return null;
}

/** The default in force for a team (falls back to the standard defaults). */
export function scopeDefault(settings: ReminderSettings, scope: ScopeId): { prefs: ReminderPrefs; stored: Stored | null } {
  const stored = settings.get(defaultKey(scope)) ?? null;
  return { prefs: stored?.prefs ?? STANDARD_PREFS, stored };
}

export type PrefsSource = "member" | "default" | "standard";

/** What applies to `email` for tasks from team `scope`, and where it comes from. */
export function effectivePrefs(
  settings: ReminderSettings,
  scope: ScopeId | null,
  email: string,
): { prefs: ReminderPrefs; source: PrefsSource; stored: Stored | null } {
  if (scope) {
    const own = settings.get(memberKey(scope, email));
    if (own) return { prefs: own.prefs, source: "member", stored: own };
    const def = settings.get(defaultKey(scope));
    if (def) return { prefs: def.prefs, source: "default", stored: def };
  }
  return { prefs: STANDARD_PREFS, source: "standard", stored: null };
}

// --------------------------------------------------------------- permissions
/** The teams this person is on — one per role that lets them assign tasks.
 *  Co-leads etc. get the same scopes, so they share them. Intern kinds with no
 *  current interns are left out. */
export function managedScopes(actor: Member): ScopeId[] {
  const s: ScopeId[] = [];
  if (actor.roles.lead && actor.group) s.push(`group:${actor.group}`);
  if (actor.roles.nmtLeader) s.push("newbies");
  for (const t of supervisedInternTypes(actor)) {
    if (MEMBERS.some((m) => memberInterns(m).includes(t))) s.push(`interns:${t}`);
  }
  if (actor.roles.vpp) s.push("club");
  return s;
}

export function scopeIncludes(scope: ScopeId, m: Member): boolean {
  if (scope === "club") return true;
  if (scope === "newbies") return m.roles.newbie;
  if (scope.startsWith("interns:")) return memberInterns(m).includes(scope.slice("interns:".length) as InternType);
  return m.group === scope.slice("group:".length);
}

/** Can `actor` change `target`'s setting for team `scope`'s tasks? */
export function canEditReminders(actor: Member, scope: ScopeId, target: Member): boolean {
  return managedScopes(actor).includes(scope) && scopeIncludes(scope, target);
}

export function scopeLabel(scope: ScopeId): string {
  if (scope === "club") return "Everyone";
  if (scope === "newbies") return "Newbies";
  if (scope.startsWith("interns:")) return `${scope.slice("interns:".length)} interns`;
  return PROJECT_GROUP_LABELS[scope.slice("group:".length) as ProjectGroup];
}

/** Who assigns the tasks these settings cover, for the settings screen. */
export function scopeTeamLabel(scope: ScopeId): string {
  if (scope === "club") return "VPs and the President";
  if (scope === "newbies") return "NMT leaders";
  if (scope.startsWith("interns:")) return `${scope.slice("interns:".length)} intern supervisors`;
  return `${PROJECT_GROUP_LABELS[scope.slice("group:".length) as ProjectGroup]} leads`;
}

/** The members of a team's scope that `viewer` may see (hidden test accounts filtered). */
export function scopeMembers(scope: ScopeId, viewer: Member): Member[] {
  return MEMBERS.filter((m) => scopeIncludes(scope, m) && canSeeMember(viewer.email, m)).sort((a, b) =>
    memberFullName(a).localeCompare(memberFullName(b)),
  );
}

export const nameOrEmail = (email: string) => {
  const m = findMember(email);
  return m ? memberFullName(m) : email;
};
