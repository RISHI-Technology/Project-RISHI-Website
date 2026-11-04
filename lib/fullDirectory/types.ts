// ============================================================================
//  Full Directory — shapes shared by the API route and the dashboard UI.
//  Data: directory_people / directory_memberships (migration-full-directory.sql),
//  filled by scripts/import-full-directory.mjs. Separate from the lms_* roster.
// ============================================================================

export type PositionType = "exec" | "lead" | "member" | "other";

export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  exec: "Exec / Leadership",
  lead: "Project Lead",
  member: "General Member",
  other: "Other role",
};
export const POSITION_TYPE_ORDER: PositionType[] = ["exec", "lead", "member", "other"];

/** "alumni" = a confirmed alum whose membership years no document records. */
export const ALUMNI_YEAR = "alumni";
/** People with a membership in this year are "current". */
export const CURRENT_YEAR = "2026-2027";

export type FullMembership = {
  year: string; // "2019-2020" | "alumni"
  yearStart: number | null;
  groups: string[];
  notYetPlaced: boolean;
  positions: string[];
  positionType: PositionType;
  classStanding: string | null;
  semesters: number | null;
  hiatus: string | null;
  hindi: string | null;
  indiaTrip: string | null;
};

export type FullPerson = {
  slug: string;
  name: string;
  /** Regular members only receive @berkeley.edu addresses. */
  emails: string[];
  /** Present ONLY for exec / webmaster. Absent (not empty) for everyone else. */
  phones?: string[];
  gradYear: number | null;
  gradYearInferred: boolean;
  major: string | null;
  joined: string | null;
  joinedApprox: boolean;
  birthday: string | null;
  indiaTrips: string[];
  hindi: string | null;
  linkedin: string | null;
  postGradPlans: string | null;
  otherInfo: { label: string; value: string }[];
  years: string[];
  firstYear: number | null;
  lastYear: number | null;
  memberships: FullMembership[];
};

export type FullDirectoryResponse = {
  people: FullPerson[];
  /** True for exec / webmaster: phones and personal emails are included. */
  canSeePrivate: boolean;
};
