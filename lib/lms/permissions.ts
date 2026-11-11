// ============================================================================
//  LMS — permission engine
// ----------------------------------------------------------------------------
//  Pure functions that encode the rules from the spec. These are used on the
//  SERVER (in the API routes) to enforce who can do what, and on the client to
//  decide which buttons/options to show. Server enforcement is the source of
//  truth — the UI is just a convenience.
// ============================================================================

import { INTERN_SUPERVISOR_EMAILS, MEMBERS, canSeeMember, memberInterns, type Member } from "@/lib/members";
import { INTERN_TYPES, type ClubEvent, type EventScopeKind, type InternType, type ProjectGroup, type Task } from "@/lib/lms/types";

const eq = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// -------------------------------------------------------------------- interns
//  Each kind of intern has its own supervisors, who may assign them tasks and
//  create events for them:
//    Finance    → every Director of Finance
//    Technology → the Director of Technology
//    India Trip → the Director of International Affairs / Initiatives
//    Outreach   → the Director of Outreach
//    Marketing  → named people (INTERN_SUPERVISOR_EMAILS in members.ts)
//  This only ADDS reach: it never takes away anything a role already grants.

/** The kinds of intern this member supervises. */
export function supervisedInternTypes(m: Member): InternType[] {
  const r = m.roles;
  const byRole: Record<InternType, boolean> = {
    Finance: r.financeDirector,
    Technology: r.techDirector,
    "India Trip": r.internationalDirector,
    Outreach: r.outreach,
    Marketing: false,
  };
  const email = m.email.trim().toLowerCase();
  return INTERN_TYPES.filter(
    (t) => byRole[t] || (INTERN_SUPERVISOR_EMAILS[t] ?? []).some((e) => e.toLowerCase() === email),
  );
}

/** Is `target` an intern of a kind that `supervisor` supervises? */
export function isSupervisedIntern(supervisor: Member, target: Member): boolean {
  const mine = supervisedInternTypes(supervisor);
  if (mine.length === 0) return false;
  return memberInterns(target).some((t) => mine.includes(t));
}

/** Supervises at least one current intern. Gates the "Assign a task" /
 *  "Create event" buttons, so a director with no interns yet (e.g. India Trip)
 *  doesn't get an empty picker. Turns on by itself once an intern is added. */
export function supervisesAnyIntern(m: Member): boolean {
  return supervisedInternTypes(m).length > 0 && MEMBERS.some((x) => isSupervisedIntern(m, x));
}

// ---------------------------------------------------------------- task assign
/** Can this member assign tasks to anyone at all? */
export function canAssignTasks(m: Member): boolean {
  return m.roles.lead || m.roles.nmtLeader || m.roles.vpp || supervisesAnyIntern(m);
}

/** Can `assigner` assign a task to `assignee`? */
export function canAssignTaskTo(assigner: Member, assignee: Member): boolean {
  if (assigner.roles.vpp) return true; // VP/P → anyone in the club
  if (assigner.roles.lead && assignee.group === assigner.group) return true; // Lead → own group (incl. self)
  if (assigner.roles.nmtLeader && assignee.roles.newbie) return true; // NMT leader → newbies
  if (isSupervisedIntern(assigner, assignee)) return true; // Director → their interns
  return false;
}

/** Every member this person is allowed to assign tasks to (hidden test accounts filtered out). */
export function assignableMembers(assigner: Member): Member[] {
  return MEMBERS.filter((m) => canAssignTaskTo(assigner, m) && canSeeMember(assigner.email, m));
}

/** Audience shapes available when ASSIGNING tasks (parallels event scopes). */
export type AssignScopeKind = "members" | "group" | "club";
export function allowedAssignScopes(m: Member): AssignScopeKind[] {
  const s = new Set<AssignScopeKind>();
  if (canAssignTasks(m)) s.add("members"); // pick specific people
  if (m.roles.lead) s.add("group"); // their own whole project group
  if (m.roles.vpp) {
    s.add("group"); // any whole project group
    s.add("club"); // everyone
  }
  return Array.from(s);
}

/** Which whole groups this person can assign a task to. */
export function assignableGroups(m: Member): ProjectGroup[] {
  if (m.roles.vpp) return ["E", "R", "W", "H"];
  if (m.roles.lead && m.group) return [m.group];
  return [];
}

// -------------------------------------------------------------- task complete
//  WHO CONTROLS COMPLETION:
//    Only the *manager* of a task — its assigner, plus that assigner's co-leads
//    (same project group) and co-NMT-leaders — may mark a task complete or
//    unmark it. This holds regardless of the doer's own club roles: a P/VP who
//    was assigned a task by someone else is just the doer, not a manager.
//
//    The doer (assignee) never marks their own task complete and never unmarks
//    it. On a task that *requires a submission*, the doer may submit proof of
//    work for review (→ "pending"); a manager then approves it to "complete".
//    A self-assigned task has no separate doer — the one person is the manager
//    and completes it directly through the manager controls.

/** True when the assignee is also the assigner (a task someone gave themselves). */
export function isSelfAssignedTask(task: Task): boolean {
  return eq(task.assigneeEmail, task.assignerEmail);
}

/**
 * The assignee submits proof of work for review → moves the task to "pending".
 * Only allowed for a genuine doer (not self-assigned); the self-assigner uses
 * the manager "mark complete" control instead.
 */
export function canSubmitTask(task: Task, actorEmail: string): boolean {
  return eq(task.assigneeEmail, actorEmail) && !isSelfAssignedTask(task);
}

/** A manager (assigner or co-lead/co-NMT) gives final approval → "complete". */
export function canApproveTask(actor: Member, task: Task): boolean {
  return canManageTask(actor, task);
}

/** A manager rejects a pending submission → back to "not_complete". */
export function canRejectTask(actor: Member, task: Task): boolean {
  return canManageTask(actor, task);
}

/**
 * Unmark a task as complete. ONLY a manager (assigner / co-lead / co-NMT) may
 * do this — never the doer of a task assigned to them by someone else.
 */
export function canUnmarkTask(actor: Member, task: Task): boolean {
  // Managers can always unmark (revert an approval). The doer may retract their
  // OWN submission while it's still pending (changed their mind before approval).
  if (canManageTask(actor, task)) return true;
  return eq(task.assigneeEmail, actor.email) && task.status === "pending";
}

// --------------------------------------------------------------- event create
/** Can this member create events at all? */
export function canCreateEvents(m: Member): boolean {
  return m.roles.nmtLeader || m.roles.lead || m.roles.internal || m.roles.vpp || supervisesAnyIntern(m);
}

/** Which audience options this member may pick from when creating an event. */
export function allowedEventScopes(m: Member): EventScopeKind[] {
  const s = new Set<EventScopeKind>();
  if (m.roles.nmtLeader) {
    s.add("members");
    s.add("all_newbies");
  }
  if (m.roles.lead) {
    s.add("members");
    s.add("group"); // their own project group
  }
  if (m.roles.internal || m.roles.vpp) {
    s.add("members");
    s.add("group");
    s.add("club");
  }
  // Intern supervisors: specific members (their interns; the "All Finance
  // Interns" style shortcuts in the form are saved as this same scope).
  if (supervisesAnyIntern(m)) s.add("members");
  return Array.from(s);
}

/**
 * For a Lead/NMT leader, an event can only target their own people. This
 * returns the set of project groups a member is allowed to target with a
 * "group"-scoped event. VP/P and Internal may target any group.
 */
export function targetableGroups(m: Member): ProjectGroup[] {
  if (m.roles.internal || m.roles.vpp) return ["E", "R", "W", "H"];
  if (m.roles.lead && m.group) return [m.group];
  return [];
}

/**
 * Which individual members this person may pick when creating a
 * "specific members" event.
 *   - Internal / VP/P → anyone in the club.
 *   - Lead           → only members of their OWN project group.
 *   - NMT leader     → newbies (NMT events target new members).
 *   - Intern supervisor → the interns they supervise.
 * Roles stack (e.g. a Lead who is also an NMT leader gets both sets).
 */
export function targetableMembers(m: Member): Member[] {
  const list = m.roles.internal || m.roles.vpp ? MEMBERS : (() => {
    const picked = new Map<string, Member>();
    if (m.roles.lead) MEMBERS.filter((x) => x.group === m.group).forEach((x) => picked.set(x.email, x));
    if (m.roles.nmtLeader) MEMBERS.filter((x) => x.roles.newbie).forEach((x) => picked.set(x.email, x));
    MEMBERS.filter((x) => isSupervisedIntern(m, x)).forEach((x) => picked.set(x.email, x));
    return Array.from(picked.values());
  })();
  return list.filter((x) => canSeeMember(m.email, x));
}

/** Server-side check: may this member target exactly these emails with a "members" event? */
export function canTargetMembers(m: Member, emails: string[]): boolean {
  const allowed = new Set(targetableMembers(m).map((x) => x.email.toLowerCase()));
  return emails.every((e) => allowed.has(e.trim().toLowerCase()));
}

// ----------------------------------------------------------- edit / delete
//  Who may edit / delete / approve / archive an existing task or event.
//
//  Ownership follows the CREATOR's peer group:
//    - The creator (task assigner / event creator) always has control.
//    - If the creator is a Lead, every Lead of the SAME project group shares
//      full control (co-leads).
//    - If the creator is an NMT leader, every NMT leader shares full control.
//  Roles stack. There is no blanket VP/P override: a VP/P who was *assigned*
//  something by their group's lead cannot manage it.

/** Everyone who shares control of things created by `creator` (incl. creator). */
export function peerEmails(creator: Member): string[] {
  const set = new Set<string>([creator.email.toLowerCase()]);
  if (creator.roles.lead) {
    MEMBERS.filter((m) => m.roles.lead && m.group === creator.group).forEach((m) =>
      set.add(m.email.toLowerCase()),
    );
  }
  if (creator.roles.nmtLeader) {
    MEMBERS.filter((m) => m.roles.nmtLeader).forEach((m) => set.add(m.email.toLowerCase()));
  }
  return Array.from(set);
}

//  CO-INTERN-SUPERVISORS work the same way, but only over intern work: when
//  the assignee is an intern of a kind that BOTH the creator and another
//  person supervise, that other person shares full control. E.g. Thanuj and
//  Sachit (both Directors of Finance) co-manage each other's tasks for Finance
//  interns, but Thanuj gets no say over Sachit's tasks for Tech interns.

/** Everyone besides `creator` who co-supervises the kind of intern `target`
 *  is (lower-case emails). Empty when `target` isn't such an intern. */
export function coInternSupervisorEmails(creator: Member, target: Member): string[] {
  const shared = memberInterns(target).filter((t) => supervisedInternTypes(creator).includes(t));
  if (shared.length === 0) return [];
  const self = creator.email.toLowerCase();
  return MEMBERS.filter(
    (m) => m.email.toLowerCase() !== self && supervisedInternTypes(m).some((t) => shared.includes(t)),
  ).map((m) => m.email.toLowerCase());
}

/** People who supervise at least one of the same intern kinds as `me`
 *  (excluding `me`): whose intern tasks `me` might co-manage. */
export function coInternSupervisorsOf(me: Member): string[] {
  const mine = supervisedInternTypes(me);
  if (mine.length === 0) return [];
  const self = me.email.toLowerCase();
  return MEMBERS.filter(
    (m) => m.email.toLowerCase() !== self && supervisedInternTypes(m).some((t) => mine.includes(t)),
  ).map((m) => m.email.toLowerCase());
}

const memberByEmail = (e: string) => MEMBERS.find((m) => eq(m.email, e));

/** Shared control through co-supervising this task's intern assignee. */
function coManagesInternTask(actor: Member, task: Task): boolean {
  const creator = memberByEmail(task.assignerEmail);
  const assignee = memberByEmail(task.assigneeEmail);
  if (!creator || !assignee) return false;
  return coInternSupervisorEmails(creator, assignee).includes(actor.email.toLowerCase());
}

/** Everyone who manages this task: assigner + co-leads / co-NMT + co-intern-supervisors. */
export function taskManagerEmails(task: Task): string[] {
  const creator = memberByEmail(task.assignerEmail);
  if (!creator) return [task.assignerEmail.trim().toLowerCase()];
  const assignee = memberByEmail(task.assigneeEmail);
  const set = new Set(peerEmails(creator));
  if (assignee) coInternSupervisorEmails(creator, assignee).forEach((e) => set.add(e));
  return Array.from(set);
}

/** Assigner emails whose tasks `me` may see/manage (me + co-leads + co-NMT +
 *  co-intern-supervisors). Wider than what `me` may manage for the last group:
 *  callers narrow those rows with canManageTask. */
export function visibleAssignerEmails(me: Member): string[] {
  return Array.from(new Set([...peerEmails(me), ...coInternSupervisorsOf(me)]));
}

/** Can `actor` edit / delete / archive / approve this task? */
export function canManageTask(actor: Member, task: Task): boolean {
  return peerEmails(actor).includes(task.assignerEmail.trim().toLowerCase()) || coManagesInternTask(actor, task);
}

/** Who may comment on a task: the people RELEVANT to it — its managers (the
 *  assigner plus their co-leads / co-NMT-leaders) and the person it's assigned
 *  to. Nobody else. */
export function canCommentOnTask(actor: Member, task: Task): boolean {
  return canManageTask(actor, task) || eq(task.assigneeEmail, actor.email);
}

/** Can `actor` edit / delete / archive this event? */
export function canManageEvent(actor: Member, event: ClubEvent): boolean {
  if (peerEmails(actor).includes(event.creatorEmail.trim().toLowerCase())) return true;
  // Co-intern-supervisor: an intern event (specific members, every one of
  // them an intern `actor` co-supervises with the creator).
  if (event.scopeKind !== "members" || event.scopeEmails.length === 0) return false;
  const creator = memberByEmail(event.creatorEmail);
  if (!creator) return false;
  const me = actor.email.toLowerCase();
  return event.scopeEmails.every((e) => {
    const target = memberByEmail(e);
    return !!target && coInternSupervisorEmails(creator, target).includes(me);
  });
}

// ----------------------------------------------------------- role display
/** Human-readable labels for a member's roles, for display on their profile. */
export function roleLabels(r: import("@/lib/lms/types").RoleFlags): string[] {
  const out: string[] = [];
  if (r.vpp) out.push("VP / President");
  if (r.exec) out.push("Exec");
  if (r.outreach) out.push("Director of Outreach");
  if (r.techDirector) out.push("Director of Technology");
  if (r.lead) out.push("Project Lead");
  if (r.internal) out.push("Internal");
  if (r.nmtLeader) out.push("New Member Training Leader");
  if (r.newbie) out.push("New Member");
  return out.length ? out : ["Member"];
}

/** Director of Outreach — the only role that can post Newsletters (Phase 5). */
export function isDirectorOfOutreach(m: Member): boolean {
  return m.roles.outreach;
}

// ============================================================================
//  Announcements — permissions (Phase 3)
// ----------------------------------------------------------------------------
//  Exec: announce to specific members (anyone), any whole group, or the whole
//        club. Leads: only members of their OWN project group.
// ============================================================================

export type AnnounceScopeKind = "members" | "group" | "club";

export function canPostAnnouncements(m: Member): boolean {
  return m.roles.exec || m.roles.lead;
}

export function announceScopes(m: Member): AnnounceScopeKind[] {
  if (m.roles.exec) return ["members", "group", "club"];
  if (m.roles.lead) return ["members", "group"];
  return [];
}

/** Whole groups this member may address. Exec → all; Lead → own group only. */
export function announceGroups(m: Member): ProjectGroup[] {
  if (m.roles.exec) return ["E", "R", "W", "H"];
  if (m.roles.lead && m.group) return [m.group];
  return [];
}

/** Individual members this person may address. Exec → anyone; Lead → own group. */
export function announceTargetableMembers(m: Member): Member[] {
  const list = m.roles.exec ? MEMBERS : MEMBERS.filter((x) => x.group === m.group && m.roles.lead);
  return list.filter((x) => canSeeMember(m.email, x));
}

/** Server-side guard: may this member address exactly these recipient emails? */
export function canAnnounceToEmails(m: Member, emails: string[]): boolean {
  if (!canPostAnnouncements(m)) return false;
  const allowed = new Set(announceTargetableMembers(m).map((x) => x.email.toLowerCase()));
  return emails.every((e) => allowed.has(e.trim().toLowerCase()));
}

// ============================================================================
//  Email & Newsletter — permissions (Phase 4)
// ============================================================================

/** Everyone can use the email tool. */
export function canSendEmail(_m: Member): boolean {
  return true;
}

/** Only the Director of Outreach can post Newsletters. */
export function canPostNewsletter(m: Member): boolean {
  return m.roles.outreach;
}

/** Which composer modes a member may open. */
export function availableModes(m: Member): Array<"email" | "announcement" | "newsletter"> {
  const modes: Array<"email" | "announcement" | "newsletter"> = ["email"];
  if (canPostAnnouncements(m)) modes.push("announcement");
  if (canPostNewsletter(m)) modes.push("newsletter");
  return modes;
}

/**
 * May this member send the EMAIL-mode message from the shared club account,
 * given the recipients? Exec always may. A lead may only if every recipient is
 * a member of the lead's own project group. Everyone else: personal only.
 */
export function canEmailFromClub(m: Member, recipientEmails: string[]): boolean {
  if (m.roles.exec) return true;
  if (!m.roles.lead) return false;
  const groupEmails = new Set(
    MEMBERS.filter((x) => x.group === m.group).map((x) => x.email.toLowerCase()),
  );
  return recipientEmails.every((e) => groupEmails.has(e.trim().toLowerCase()));
}

// ------------------------------------------------------------------- meetings
/** Who can CREATE a meeting for a group: that group's leads, or any VP/President. */
export function canCreateMeeting(m: Member, group: ProjectGroup): boolean {
  if (m.roles.vpp) return true;
  return m.roles.lead && m.group === group;
}
/** Who can EDIT a meeting's agenda/notes: any member of that group, or VP/P. */
export function canEditMeeting(m: Member, group: ProjectGroup): boolean {
  return m.group === group || m.roles.vpp;
}
/** Who can edit a group's meeting TEMPLATE: that group's leads, or VP/P. */
export function canEditTemplate(m: Member, group: ProjectGroup): boolean {
  return canCreateMeeting(m, group);
}
