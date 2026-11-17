// ============================================================================
//  Leadership tree layout — derived ONLY from each role's slot (plus an optional
//  explicit parent). Editors never draw edges; these rules do.
//
//  two_vp  (VP Internal + VP of Projects years, e.g. 2026–27)
//    President
//    ├─ VP Internal ── every director / exec role, the projects-director group
//    │                 if any, "other" roles and parentless interns
//    └─ VP of Projects ── per project group: Senior Lead ── that group's leads
//                         (leads whose group has no senior lead hang directly)
//
//  one_vp / pvp_only  (one VP)
//    President ── VP ── every director / exec role, and ONE shared node for all
//                       projects-director roles; every lead hangs beneath that
//                       node (or beneath the VP when a year has none).
//    pvp_only years simply have no roles below the VP.
//
//  Any year: a role with an explicit parent (interns under their director,
//  "Internal" under VP Internal) hangs under that parent instead. A role whose
//  usual parent is missing moves up to the nearest one that exists, so every
//  role is always shown exactly once.
// ============================================================================

import type { LeadershipRole, Structure } from "./types";

export type TreeNode = {
  key: string;
  /** One role, or several roles shown as one shared node (multiple projects directors). */
  roles: LeadershipRole[];
  children: TreeNode[];
};

const byOrder = (a: LeadershipRole, b: LeadershipRole) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
const sameGroup = (a: string | null, b: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function buildTree(structure: Structure, input: LeadershipRole[]): TreeNode[] {
  const roles = [...input].sort(byOrder);
  const byId = new Map(roles.map((r) => [r.id, r]));

  // ---- explicit parents (same year, not itself, no cycles)
  const validParent = (r: LeadershipRole): LeadershipRole | null => {
    const seen = new Set<string>([r.id]);
    let p = r.parentRoleId ? byId.get(r.parentRoleId) : undefined;
    const first = p ?? null;
    while (p) {
      if (seen.has(p.id) || p.year !== r.year) return null;
      seen.add(p.id);
      p = p.parentRoleId ? byId.get(p.parentRoleId) : undefined;
    }
    return first;
  };
  const explicitKids = new Map<string, LeadershipRole[]>();
  const free: LeadershipRole[] = [];
  for (const r of roles) {
    const p = validParent(r);
    if (p) explicitKids.set(p.id, [...(explicitKids.get(p.id) ?? []), r]);
    else free.push(r);
  }

  // ---- leads attach to their group's senior lead, wherever that senior sits
  const seniors = roles.filter((r) => r.slot === "senior_lead");
  const leadsUnder = new Map<string, LeadershipRole[]>();
  const looseLeads: LeadershipRole[] = [];
  for (const r of free.filter((x) => x.slot === "lead")) {
    const s = seniors.find((x) => sameGroup(x.projectGroup, r.projectGroup));
    if (s) leadsUnder.set(s.id, [...(leadsUnder.get(s.id) ?? []), r]);
    else looseLeads.push(r);
  }

  const node = (rs: LeadershipRole[], extra: TreeNode[] = []): TreeNode => ({
    key: rs.map((r) => r.id).join("+"),
    roles: rs,
    children: [
      ...extra,
      ...rs.flatMap((r) => (leadsUnder.get(r.id) ?? []).map((l) => node([l]))),
      ...rs.flatMap((r) => (explicitKids.get(r.id) ?? []).map((k) => node([k]))),
    ],
  });
  /** Nodes in sort order: each entry is [the order it sorts by, the node]. */
  const ordered = (items: [number, TreeNode][]) => items.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const single = (rs: LeadershipRole[]): [number, TreeNode][] => rs.map((r) => [r.sortOrder, node([r])]);

  const of = (slot: LeadershipRole["slot"]) => free.filter((r) => r.slot === slot);
  const presidents = of("president");
  const vps = of("vp");
  const vpInternal = of("vp_internal");
  const vpProjects = of("vp_projects");
  const directors = of("director");
  const projectsDirectors = of("projects_director");
  const sideRoles = [...of("other"), ...of("intern")];

  // Senior leads (with their leads) and leads that have no senior lead.
  const leadTree = ordered([...single(of("senior_lead")), ...single(looseLeads)]);
  const pdItems: [number, TreeNode][] = projectsDirectors.length
    ? [[projectsDirectors[0].sortOrder, node(projectsDirectors, structure === "two_vp" ? [] : leadTree)]]
    : [];

  let underTop: TreeNode[];
  if (structure === "two_vp") {
    const internalSide = ordered([...single(directors), ...pdItems, ...single(sideRoles)]);
    underTop = [
      ...vps.map((r) => node([r])),
      ...(vpInternal.length ? [node(vpInternal, internalSide)] : internalSide),
      ...(vpProjects.length ? [node(vpProjects, leadTree)] : leadTree),
    ];
  } else {
    const vpKids = ordered([
      ...single(directors), ...pdItems, ...single(sideRoles), ...single(vpInternal), ...single(vpProjects),
    ]);
    if (!projectsDirectors.length) vpKids.push(...leadTree);
    underTop = vps.length ? [node(vps, vpKids)] : vpKids;
  }
  return presidents.length ? [node(presidents, underTop)] : underTop;
}

/** Every role id placed in the tree, in order (each role must appear exactly once). */
export function rolesInTree(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) => [...n.roles.map((r) => r.id), ...rolesInTree(n.children)]);
}
