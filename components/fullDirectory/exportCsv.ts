// Full Directory — CSV export of exactly what's on screen (filters + sort).
// Built only from the API response, which the server has already redacted for
// this viewer, so a regular member's export can't contain phones or personal
// emails. No dues data exists anywhere in this feature.
import type { FullMembership } from "@/lib/fullDirectory/types";
import { POSITION_TYPE_LABELS } from "@/lib/fullDirectory/types";
import type { Match } from "@/components/fullDirectory/filters";
import { jobDates, longYear } from "@/components/fullDirectory/model";

/** Quote a cell; neutralise spreadsheet formulas (but keep "+1 …" phone numbers readable). */
function cell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^\+?[\d\s().-]+(\s*\(.*\))?$/.test(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const byYearList = (ms: FullMembership[], f: (m: FullMembership) => string) =>
  ms.map((m) => { const v = f(m); return v ? `${longYear(m.year)}: ${v}` : ""; }).filter(Boolean).join("; ");

export function buildCsv(rows: Match[], canSeePrivate: boolean, perYear: boolean): string {
  const personHead = ["Name", "Years active", "Class of", "Majors", "Minors", "Joined RISHI", "Birthday", "India trips", "Hindi", "LinkedIn", "Post-grad plans", "Current role", "Employment history", "Years at Berkeley", "Emails", ...(canSeePrivate ? ["Phones"] : [])];
  const personCells = (m: Match) => {
    const p = m.person;
    return [
      p.name, p.years.map(longYear).join("; ") || "Alumni (years unknown)",
      p.gradYear ? `${p.gradYear}${p.gradYearInferred ? " (estimated)" : ""}` : "", p.majors.join("; "), p.minors.join("; "),
      p.joined ? `${p.joined}${p.joinedApprox ? " (approx.)" : ""}` : "", p.birthday, p.indiaTrips.join("; "), p.hindi,
      p.linkedin, p.postGradPlans, p.currentRole,
      p.employment.map((j) => [[j.title, j.company].filter(Boolean).join(", "), jobDates(j.start, j.end, j.current)].filter(Boolean).join(" ")).join("; "),
      p.berkeleyYears, p.emails.join("; "), ...(canSeePrivate ? [(p.phones ?? []).join("; ")] : []),
    ];
  };
  let lines: (string | number | null | undefined)[][];
  if (perYear) {
    lines = [["Year", "Project group", "Position", "Position type", "Class standing", "Semesters in RISHI", "India trip", ...personHead]];
    for (const m of rows) for (const ms of m.context)
      lines.push([longYear(ms.year), ms.groups.join("; ") || (ms.notYetPlaced ? "Not yet placed" : ""), ms.positions.join("; "),
        POSITION_TYPE_LABELS[ms.positionType], ms.classStanding, ms.semesters, ms.indiaTrip, ...personCells(m)]);
  } else {
    lines = [[...personHead.slice(0, 2), "Project groups", "Positions", ...personHead.slice(2)]];
    for (const m of rows) {
      const c = personCells(m);
      lines.push([...c.slice(0, 2), byYearList(m.context, (x) => x.groups.join(" & ")), byYearList(m.context, (x) => x.positions.join(" & ")), ...c.slice(2)]);
    }
  }
  return "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}

/** Today in the club's timezone, for the filename (never a naive timestamp). */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function downloadCsv(rows: Match[], canSeePrivate: boolean, perYear: boolean): void {
  const blob = new Blob([buildCsv(rows, canSeePrivate, perYear)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rishi-full-directory-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
