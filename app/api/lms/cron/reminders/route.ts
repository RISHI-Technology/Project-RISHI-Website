import { NextResponse } from "next/server";
import { ensureUpcomingMeetings } from "@/lib/lms/meetingSchedule";
import { listRemindableTasks, markRemindersSent } from "@/lib/lms/store";
import { notifyTaskReminderDigest } from "@/lib/lms/notify";
import { buildIndexStepLocked } from "@/lib/lms/agent/admin";
import { ensureRoster } from "@/lib/lms/roster";
import { findMember } from "@/lib/members";
import { effectivePrefs, loadReminderSettings, taskScope } from "@/lib/lms/reminderPrefs";
import { planReminders } from "@/lib/lms/reminderPlan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// When reminders go out, how they're bundled into one email per member, and
// what they list: see lib/lms/reminderPlan.ts. How often each member gets
// them is set by the team that assigned each task: see lib/lms/reminderPrefs.ts.

// Accept the secret via Authorization: Bearer, x-cron-secret, or ?secret=.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

async function run(req: Request) {
  if (!process.env.CRON_SECRET)
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });

  await ensureRoster(); // members' groups/roles decide which default applies
  const tasks = await listRemindableTasks();
  // If the settings can't be read, skip reminders this run rather than send
  // with the standard defaults (which would ignore a lead who turned them off).
  let settingsError: string | null = null;
  const settings = await loadReminderSettings().catch((e: Error) => { settingsError = e.message; return null; });
  const plan = settings
    ? planReminders(
        tasks,
        (t) => effectivePrefs(settings, taskScope(findMember(t.assignerEmail), findMember(t.assigneeEmail)), t.assigneeEmail).prefs,
        Date.now(),
      )
    : { emails: [], marks: [] };

  let sent = 0;
  for (const email of plan.emails) {
    await notifyTaskReminderDigest(email.to, email.items).catch(() => {});
    sent++;
  }
  for (const m of plan.marks) await markRemindersSent(m.id, m.keys).catch(() => {});

  // Also create next Tuesday's meeting pages once the Wednesday after a meeting
  // begins (idempotent; see lib/lms/meetingSchedule.ts).
  let meetings: unknown = null;
  try { meetings = await ensureUpcomingMeetings(); } catch (e) { meetings = { error: (e as Error).message }; }

  // One short embedding batch per run. At one run an hour that's 24 batches of
  // 40 = 960 passages a day, still above the 800-a-day building cap in
  // embed.ts, so going hourly doesn't slow the backlog down.
  // (Original note:) One short embedding batch, riding on this frequent, cheap job. Embedding
  // used to run inside the hourly files job, where it kept a function alive
  // sleeping 30s between batches. Here it does a single batch (a second or two)
  // and returns; the pacing is simply how often this cron runs. Chunking stays
  // with the files job, which is where new text appears.
  let ask: unknown = null;
  try { ask = await buildIndexStepLocked(8_000, { chunk: false }); }
  catch (e) { ask = { error: (e as Error).message }; }

  return NextResponse.json({
    ok: true,
    scanned: tasks.length,
    sent,
    tasksListed: plan.emails.reduce((n, e) => n + e.items.length, 0),
    ...(settingsError ? { reminderSettingsError: settingsError } : {}),
    meetings,
    ask,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
