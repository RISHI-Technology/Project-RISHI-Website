// ============================================================================
//  Leadership history ("Lore → Leadership") — shapes shared by the API routes,
//  the tree, the person popup and the webmaster editor.
//  Data: leadership_years / leadership_roles / leadership_holders
//  (migration-leadership.sql), seeded by scripts/seed-leadership.mjs.
//
//  Kept free of "@/" imports so scripts and quick checks can load it directly.
// ============================================================================

/** How a year's tree is laid out (see lib/leadership/tree.ts). */
export const STRUCTURES = ["two_vp", "one_vp", "pvp_only"] as const;
export type Structure = (typeof STRUCTURES)[number];

export const STRUCTURE_LABELS: Record<Structure, string> = {
  two_vp: "President + VP Internal + VP of Projects",
  one_vp: "President + one VP",
  pvp_only: "President + VP only",
};

/** A role's place in the tree. Editors pick a slot; the edges are derived from it. */
export const SLOTS = [
  "president", "vp", "vp_internal", "vp_projects", "director", "projects_director",
  "senior_lead", "lead", "intern", "other",
] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  president: "President",
  vp: "Vice President",
  vp_internal: "VP Internal",
  vp_projects: "VP of Projects",
  director: "Director / exec",
  projects_director: "Projects director",
  senior_lead: "Senior lead",
  lead: "Project lead",
  intern: "Intern",
  other: "Other",
};

/** Project groups, named exactly as the Full Directory normalizes them, so the
 *  group chips get the same colours everywhere. Editors may type others. */
export const PROJECT_GROUPS = [
  "Education",
  "Health",
  "Women's Empowerment",
  "Water & Sanitation (WatSan)",
  "Rainwater Harvesting",
  "Agriculture",
  "Women's Health",
  "FFM (Finance/Fundraising/Marketing)",
] as const;

export const YEAR_RE = /^(\d{4})-(\d{4})$/;
/** "2024-2025" is valid; the second year must follow the first. */
export function isYearKey(y: string): boolean {
  const m = YEAR_RE.exec(y);
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}
/** "2024-2025" → "2024–25". */
export const shortLeadershipYear = (y: string) => `${y.slice(0, 4)}–${y.slice(7, 9)}`;

export type LeadershipYear = {
  year: string;
  structure: Structure;
  note: string | null;
};

export type LeadershipRole = {
  id: string;
  year: string;
  title: string;
  slot: Slot;
  /** For leads and senior leads: which project group. */
  projectGroup: string | null;
  /** Explicit parent (interns under their director, "Internal" under VP Internal). */
  parentRoleId: string | null;
  sortOrder: number;
};

export type LeadershipHolder = {
  id: string;
  roleId: string;
  name: string;
  /** directory_people.id — the stable Full Directory record (slugs can change). */
  personId: string | null;
  /** Short text shown under the name on the tree ("Fall 2019"). */
  qualifier: string | null;
  /** Longer context shown only in the person popup ("Title not stated"). */
  note: string | null;
  sortOrder: number;
};

/** The Full Directory facts the popup needs for a linked person. */
export type LinkedPerson = {
  id: string;
  slug: string;
  name: string;
  memberships: {
    year: string;
    groups: string[];
    positions: string[];
    positionType: "exec" | "lead" | "member" | "other";
    notYetPlaced: boolean;
  }[];
};

export type LeadershipData = {
  years: LeadershipYear[];
  roles: LeadershipRole[];
  holders: LeadershipHolder[];
  /** Keyed by directory_people.id, for every linked holder. */
  people: Record<string, LinkedPerson>;
  /** True for webmasters: shows the "Edit" entry point. The API enforces it too. */
  canEdit: boolean;
};

/** The default year: the current school year when it has data, else the newest. */
export const CURRENT_LEADERSHIP_YEAR = "2026-2027";
