// ============================================================================
//  Reminder planning — which reminder emails go out on this run, and to whom
// ----------------------------------------------------------------------------
//  Pure (no I/O), so the rules can be tested on their own. The hourly cron
//  (app/api/lms/cron/reminders) loads the tasks + settings, calls this, sends
//  the emails it returns and saves the marks.
//
//  RULES
//   - Before the due time a task has up to four reminder moments (1 day,
//     6 hours, 3 hours, 1 hour before), each sent once. Which of them a member
//     gets is set by whoever can assign them tasks (lib/lms/reminderPrefs.ts;
//     by default only 1 day and 1 hour). Nothing is ever sent more than a
//     day before the due time.
//   - After the due time, reminders repeat daily / every 2 days / weekly, or
//     not at all, by the same setting.
//   - A member gets AT MOST ONE reminder email per run, and when one goes out
//     it lists ALL their tasks that are currently relevant — not just the one
//     whose moment came up: tasks due within the next day (once their first
//     reminder has opened) under "This Week", and overdue ones under "Last
//     Week". An overdue task's repeat cycle restarts from that email.
//   - Tasks due at different hours share emails in two ways:
//       * Day-before reminders wait (up to 12 hours before the due time) while
//         another task's reminder is coming up, so e.g. all of tomorrow's
//         tasks arrive in one email instead of one per deadline.
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
export const WINDOWS: ReadonlyArray<{ key: BeforeKey; ms: number; cover: number }> = [
  { key: "1d", ms: DAY_MS, cover: 0 },
  { key: "6h", ms: 6 * HOUR, cover: 3 * HOUR },
  { key: "3h", ms: 3 * HOUR, cover: 2 * HOUR },
  { key: "1h", ms: HOUR, cover: HOUR },
];
/** The 1-day reminder may wait until this long before the due time, to share an email. */
export const DAY_BEFORE_LATEST_MS = 12 * HOUR;

// The job runs once an hour. A reminder is sent on the run NEAREST its moment
// rather than the first run after it: looking ahead half an interval means a
// "1 hour" reminder lands between 30 and 90 minutes before the deadline,
// instead of anywhere from 60 minutes down to 1 minute before it.
export const RUN_EVERY_MS = 60 * 60_000;
export const LOOKAHEAD_MS = RUN_EVERY_MS / 2;

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

type Candidate = {
  item: ReminderItem; fires: boolean; newKeys: string[];
  /** Only the 1-day reminder is due: it may wait until this time. */
  dayBeforeOnlyUntil: number | null;
  /** When this task's next unsent reminders will come up. */
  upcoming: number[];
  listed: boolean;
};

function consider(t: Task, prefs: ReminderPrefs, now: number): Candidate | null {
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

  if (now < due) {
    const enabled = WINDOWS.filter((w) => prefs.before.includes(w.key));
    if (enabled.length === 0) return null; // before-due reminders turned off
    const left = due - now;
    const pending = enabled.filter((w) => due - w.ms >= created && !already.has(w.key));
    const firing = pending.filter((w) => now + LOOKAHEAD_MS >= due - w.ms);
    const fires = firing.length > 0;
    const dayBeforeOnlyUntil = fires && firing.every((w) => w.key === "1d") ? due - DAY_BEFORE_LATEST_MS : null;
    const upcoming = pending.filter((w) => now + LOOKAHEAD_MS < due - w.ms).map((w) => Math.max(due - w.ms - LOOKAHEAD_MS, due - DAY_MS));
    const earliest = Math.max(...enabled.map((w) => w.ms));
    if (left > DAY_MS || now + LOOKAHEAD_MS < due - earliest) // not listed yet (never earlier than a day before)
      return { item: { task: t, state: "due", ms: left }, fires: false, newKeys: [], dayBeforeOnlyUntil: null, upcoming, listed: false };
    // Listing the task covers every reminder moment that has passed or comes
    // within its cover (enabled or not, so a later setting change can't
    // resurrect a stale one).
    const newKeys = WINDOWS.filter((w) => due - w.ms < now + Math.max(w.cover, LOOKAHEAD_MS) && !already.has(w.key)).map((w) => w.key);
    return { item: { task: t, state: "due", ms: left }, fires, newKeys, dayBeforeOnlyUntil, upcoming, listed: true };
  }

  // Past due.
  if (prefs.overdue === "off") return null;
  const every = OVERDUE_EVERY_DAYS[prefs.overdue];
  const today = utcDate(now);
  const sentDays = Array.from(already).filter((k) => k.startsWith("overdue:")).map((k) => k.slice("overdue:".length)).sort();
  const last = sentDays[sentDays.length - 1];
  const fires = !last || daysBetween(last, today) >= every;
  const todayKey = `overdue:${today}`;
  return { item: { task: t, state: "overdue", ms: now - due }, fires, newKeys: already.has(todayKey) ? [] : [todayKey], dayBeforeOnlyUntil: null, upcoming: [], listed: true };
}

export function planReminders(
  tasks: Task[],
  prefsFor: (task: Task) => ReminderPrefs, // the assigning team's setting for this task's assignee
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
    // Only day-before reminders are due: hold them while another task's
    // reminder comes up before the latest they may go, so they share an email.
    if (firing.every((c) => c.dayBeforeOnlyUntil !== null)) {
      const until = Math.min(...firing.map((c) => c.dayBeforeOnlyUntil!));
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
