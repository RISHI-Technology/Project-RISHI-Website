// ============================================================================
//  Reminder planning — which reminder emails go out on this run, and to whom
// ----------------------------------------------------------------------------
//  Pure (no I/O), so the rules can be tested on their own. The hourly cron
//  (app/api/lms/cron/reminders) loads the tasks + settings, calls this, sends
//  the emails it returns and saves the marks.
//
//  RULES
//   - Before the due time a task has reminder moments from 1 week down to
//     1 hour before (1 week, 6…2 days, 1 day, 6 hours, 3 hours, 1 hour), each
//     sent once. Which of them a member gets is set by the team that assigned
//     the task (lib/lms/reminderPrefs.ts; by default only 1 day and 1 hour).
//     Nothing is ever sent earlier than the earliest reminder chosen.
//   - After the due time, reminders repeat daily / every 2 days / weekly, or
//     not at all, by the same setting.
//   - Changing a setting only affects reminders STILL AHEAD. Turning on e.g.
//     "3 days" when a task is due in 2 never sends a catch-up email: reminders
//     whose moment had passed more than one run before the change are
//     skipped (anything enabled before then was already sent by an earlier
//     run). Likewise, turning overdue reminders on / up takes effect at the
//     next daily overdue reminder, not on the next hourly run.
//   - A member gets AT MOST ONE reminder email per run, and when one goes out
//     it lists ALL their tasks that are currently relevant — not just the one
//     whose moment came up: tasks not yet due (once their first reminder has
//     come up) under "This Week", and overdue ones under "Last
//     Week". An overdue task's repeat cycle restarts from that email.
//   - Tasks due at different hours share emails in two ways:
//       * Day reminders (1 day to 1 week) may wait up to 12 hours while
//         another task's reminder is coming up, so e.g. all of tomorrow's
//         tasks arrive in one email instead of one per deadline. They are
//         never sent early, only (a little) late.
//       * No repeats: being listed in an email counts as a task's next
//         reminder if that would otherwise come soon after — within 3 hours
//         (6-hour reminder), 2 hours (3-hour) or 1 hour (1-hour). These gaps
//         are shorter than the gaps between one task's own reminders, so a
//         task's own next reminder is never swallowed.
// ============================================================================

import { hasRealDueDate, isPlaceholderEmail } from "@/lib/lms/importedTasks";
import { OVERDUE_EVERY_DAYS, type BeforeKey, type ReminderPrefs } from "@/lib/lms/reminderPrefs";
import type { Task } from "@/lib/lms/types";

const HOUR = 3_600_000;
export const DAY_MS = 24 * HOUR;

// cover: an email also counts as this reminder for a listed task when the
// reminder would otherwise come less than this long after it.
// day: a whole-day reminder — sent on the first run at/after its moment (never
// early), and allowed to wait up to DAY_WAIT_MS to share an email.
export const WINDOWS: ReadonlyArray<{ key: BeforeKey; ms: number; cover: number; day: boolean }> = [
  ...([7, 6, 5, 4, 3, 2, 1] as const).map((n) => ({ key: `${n}d` as BeforeKey, ms: n * DAY_MS, cover: 0, day: true })),
  { key: "6h", ms: 6 * HOUR, cover: 3 * HOUR, day: false },
  { key: "3h", ms: 3 * HOUR, cover: 2 * HOUR, day: false },
  { key: "1h", ms: HOUR, cover: HOUR, day: false },
];
/** How long a day reminder may wait to share an email with another task's. */
export const DAY_WAIT_MS = 12 * HOUR;

// The job runs once an hour. A reminder is sent on the run NEAREST its moment
// rather than the first run after it: looking ahead half an interval means a
// "1 hour" reminder lands between 30 and 90 minutes before the deadline,
// instead of anywhere from 60 minutes down to 1 minute before it.
export const RUN_EVERY_MS = 60 * 60_000;
export const LOOKAHEAD_MS = RUN_EVERY_MS / 2;
/** How early a reminder may fire on the run nearest its moment (hour reminders only). */
const early = (w: { day: boolean }) => (w.day ? 0 : LOOKAHEAD_MS);

export const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

export type ReminderItem = {
  task: Task;
  /** "due" = not yet due (This Week); "overdue" = past due (Last Week). */
  state: "due" | "overdue";
  /** Time left until due ("due") or time since due ("overdue"). */
  ms: number;
};

export type ReminderPlan = {
  /** One email per recipient (lower-case email → the tasks to list). */
  emails: Array<{ to: string; items: ReminderItem[] }>;
  /** Tasks whose remindersSent list changed → the full new list. */
  marks: Array<{ id: string; keys: string[] }>;
};

/** A member's setting for one task, plus when that setting last changed (ms). */
export type TaskPrefs = ReminderPrefs & { since?: number | null };

type Candidate = {
  item: ReminderItem; fires: boolean; newKeys: string[];
  /** Only day reminders are due: they may wait until this time. */
  dayOnlyUntil: number | null;
  /** When this task's next unsent reminders will come up. */
  upcoming: number[];
  listed: boolean;
};

function consider(t: Task, prefs: TaskPrefs, now: number): Candidate | null {
  // Archived tasks never get reminders. The query already excludes them; this
  // keeps that true even if the query changes.
  if (t.archived) return null;
  // Imported stand-ins: the due date isn't real and the address can't receive
  // mail. Real tasks — including ones created by the agenda import — still
  // get their normal reminders.
  if (!hasRealDueDate(t.tags) || isPlaceholderEmail(t.assigneeEmail)) return null;
  const due = new Date(t.dueAt).getTime();
  const created = new Date(t.createdAt).getTime();
  if (Number.isNaN(due)) return null;
  const already = new Set(t.remindersSent ?? []);
  const changed = prefs.since ?? null;

  if (now < due) {
    const enabled = WINDOWS.filter((w) => prefs.before.includes(w.key));
    if (enabled.length === 0) return null; // before-due reminders turned off
    const left = due - now;
    const pending = enabled.filter((w) =>
      due - w.ms >= created && // its moment came after the task existed
      (changed === null || due - w.ms >= changed - RUN_EVERY_MS) && // …and not long before the setting changed
      !already.has(w.key));
    const firing = pending.filter((w) => now + early(w) >= due - w.ms);
    const fires = firing.length > 0;
    const dayOnlyUntil = fires && firing.every((w) => w.day)
      ? due - Math.min(...firing.map((w) => w.ms)) + DAY_WAIT_MS
      : null;
    const upcoming = pending.filter((w) => now + early(w) < due - w.ms).map((w) => due - w.ms - early(w));
    const first = enabled[0]; // WINDOWS is ordered earliest-first
    if (now + early(first) < due - first.ms) // not listed yet: never earlier than the earliest reminder chosen
      return { item: { task: t, state: "due", ms: left }, fires: false, newKeys: [], dayOnlyUntil: null, upcoming, listed: false };
    // Listing the task covers every reminder moment that has passed or comes
    // within its cover (enabled or not, so a later setting change can't
    // resurrect a stale one).
    // Day reminders count only once their moment has come (never early).
    const covered = (w: (typeof WINDOWS)[number]) =>
      w.day ? due - w.ms <= now : due - w.ms < now + Math.max(w.cover, LOOKAHEAD_MS);
    const newKeys = WINDOWS.filter((w) => covered(w) && !already.has(w.key)).map((w) => w.key);
    return { item: { task: t, state: "due", ms: left }, fires, newKeys, dayOnlyUntil, upcoming, listed: true };
  }

  // Past due.
  if (prefs.overdue === "off") return null;
  const every = OVERDUE_EVERY_DAYS[prefs.overdue];
  const today = utcDate(now);
  const sentDays = Array.from(already).filter((k) => k.startsWith("overdue:")).map((k) => k.slice("overdue:".length)).sort();
  const last = sentDays[sentDays.length - 1];
  // Setting changed today, after today's overdue reminders already went out
  // (first run of the UTC day), on a task that was already overdue: start
  // from the next daily reminder rather than sending one now.
  const changedAfterTodaysRun = changed !== null && due < changed &&
    utcDate(changed) === today && changed - Date.parse(`${today}T00:00:00Z`) > RUN_EVERY_MS;
  const fires = !changedAfterTodaysRun && (!last || daysBetween(last, today) >= every);
  const todayKey = `overdue:${today}`;
  return { item: { task: t, state: "overdue", ms: now - due }, fires, newKeys: already.has(todayKey) ? [] : [todayKey], dayOnlyUntil: null, upcoming: [], listed: true };
}

export function planReminders(
  tasks: Task[],
  prefsFor: (task: Task) => TaskPrefs, // the assigning team's setting for this task's assignee
  now: number,
): ReminderPlan {
  const byPerson = new Map<string, Candidate[]>();
  for (const t of tasks) {
    const c = consider(t, prefsFor(t), now);
    if (!c) continue;
    const to = t.assigneeEmail.trim().toLowerCase();
    const list = byPerson.get(to) ?? [];
    list.push(c);
    byPerson.set(to, list);
  }

  const plan: ReminderPlan = { emails: [], marks: [] };
  for (const [to, cands] of Array.from(byPerson.entries())) {
    const firing = cands.filter((c) => c.fires);
    if (!firing.length) continue; // nothing of theirs is due a reminder this run
    // Only day reminders are due: hold them while another task's reminder
    // comes up before the latest they may go, so they share an email.
    if (firing.every((c) => c.dayOnlyUntil !== null)) {
      const until = Math.min(...firing.map((c) => c.dayOnlyUntil!));
      if (cands.some((c) => !c.fires && c.upcoming.some((at) => at <= until))) continue;
    }
    const items = cands
      .filter((c) => c.listed)
      .map((c) => c.item)
      .sort((a, b) => new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime());
    plan.emails.push({ to, items });
    for (const c of cands) {
      if (c.listed && c.newKeys.length) plan.marks.push({ id: c.item.task.id, keys: [...(c.item.task.remindersSent ?? []), ...c.newKeys] });
    }
  }
  return plan;
}

/** What the email says, from the time actually left — not the window's label.
 *  With hourly runs a "1 hour" reminder can go out 45 or 80 minutes early, and
 *  the email shouldn't claim exactly an hour when it isn't. */
export function timeLeftPhrase(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 90) {
    const m = Math.max(5, Math.round(min / 5) * 5);
    return m === 60 ? "in 1 hour" : `in ${m} minutes`;
  }
  const hours = Math.round(min / 60);
  if (hours < 36) return `in about ${hours} hours`;
  const days = Math.round(hours / 24);
  return `in about ${days} day${days === 1 ? "" : "s"}`;
}

export function overduePhrase(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `by ${days} day${days === 1 ? "" : "s"}`;
  }
  const h = Math.max(1, hours);
  return `by ${h} hour${h === 1 ? "" : "s"}`;
}
