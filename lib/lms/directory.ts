// ============================================================================
//  Member directory — a club-wide table of everyone's name, role, email, phone.
// ----------------------------------------------------------------------------
//  Email and phone default to what's in members.ts, but each member may override
//  THEIR OWN contact email / phone for the directory only. Overrides live in
//  lms_contact_overrides and never affect the login email or anything in
//  members.ts.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MEMBERS, memberDisplayRole, memberFullName, memberRoleLabel, memberTitle, memberYear } from "@/lib/members";
import { PROJECT_GROUP_LABELS } from "@/lib/lms/types";
import { formatPhone } from "@/lib/lms/phone";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client)
    _client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  return _client;
}

const lc = (e: string) => e.trim().toLowerCase();

export type ContactOverride = { contactEmail: string | null; phone: string | null };
export type DirectoryEntry = {
  loginEmail: string; // stable identity (never changes)
  name: string;
  role: string;
  group: string;
  email: string; // override ?? members.ts email
  phone: string; // override ?? members.ts phone ?? ""
  year: string; // year at Berkeley ("" = not specified)
  positionCategory: string; // bucket for filtering (role label, or "General Member")
  positionRank: number; // custom directory order (lower = higher up)
};

// The order positions appear in the directory (NOT a real hierarchy — just the
// requested display order). Matches the labels memberRoleLabel produces.
export const POSITION_ORDER = [
  "President",
  "VP Internal",
  "VP of Projects",
  "NMT Leader",
  "Director of International Affairs",
  "Director of Finance",
  "Director of Outreach",
  "Education Lead",
  "Health Lead",
  "Water & Sanitation Lead",
  "Women's Empowerment Lead",
] as const;

// Everyone without a listed title is a General Member — except newbies, who get
// their own bucket, listed just below General Member.
const GENERAL = "General Member";
const NEWBIE = "Newbie"; // the exact label memberRoleLabel gives a newbie-only member
function positionRank(label: string): number {
  const i = (POSITION_ORDER as readonly string[]).indexOf(label);
  if (i !== -1) return i;
  return label === NEWBIE ? POSITION_ORDER.length + 1 : POSITION_ORDER.length;
}
// Display-only Senior Lead titles (MEMBER_TITLES) get their own bucket, just
// after the leads — but only for someone who'd otherwise be a General Member;
// a real role (e.g. a director) keeps its own bucket.
const SENIOR_LEAD = "Senior Lead";
function categoryFor(base: string, title: string): string {
  const c = positionCategory(base);
  return c === GENERAL && /Senior Lead$/.test(title) ? SENIOR_LEAD : c;
}
function rankFor(base: string, title: string): number {
  return categoryFor(base, title) === SENIOR_LEAD ? POSITION_ORDER.length - 0.5 : positionRank(base);
}
function positionCategory(label: string): string {
  if ((POSITION_ORDER as readonly string[]).includes(label)) return label;
  return label === NEWBIE ? NEWBIE : GENERAL;
}

// In-memory fallback, keyed by login email.
const mem = new Map<string, ContactOverride>();

async function allOverrides(): Promise<Map<string, ContactOverride>> {
  if (usingSupabase) {
    const { data, error } = await sb().from("lms_contact_overrides").select("*");
    if (error) throw new Error(error.message);
    const m = new Map<string, ContactOverride>();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    for (const r of (data ?? []) as any[]) {
      m.set(lc(r.email), { contactEmail: r.contact_email ?? null, phone: r.phone ?? null });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return m;
  }
  return new Map(mem);
}

export async function getContactOverride(email: string): Promise<ContactOverride | null> {
  const overrides = await allOverrides();
  return overrides.get(lc(email)) ?? null;
}

/** Update the current member's directory contact info. Empty string clears the
 *  override for that field (reverts to the members.ts default). */
export async function setContactOverride(
  email: string,
  next: { contactEmail?: string; phone?: string },
): Promise<void> {
  const key = lc(email);
  const contactEmail = next.contactEmail !== undefined ? next.contactEmail.trim() || null : undefined;
  const phone = next.phone !== undefined ? next.phone.trim() || null : undefined;

  if (usingSupabase) {
    const existing = (await getContactOverride(email)) ?? { contactEmail: null, phone: null };
    const row = {
      email: key,
      contact_email: contactEmail !== undefined ? contactEmail : existing.contactEmail,
      phone: phone !== undefined ? phone : existing.phone,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb().from("lms_contact_overrides").upsert(row, { onConflict: "email" });
    if (error) throw new Error(error.message);
    return;
  }
  const existing = mem.get(key) ?? { contactEmail: null, phone: null };
  mem.set(key, {
    contactEmail: contactEmail !== undefined ? contactEmail : existing.contactEmail,
    phone: phone !== undefined ? phone : existing.phone,
  });
}

/** The full club directory (excludes hidden test accounts). */
export async function listDirectory(): Promise<DirectoryEntry[]> {
  const overrides = await allOverrides();
  return MEMBERS.filter((m) => !m.hidden)
    .map((m) => {
      const o = overrides.get(lc(m.email));
      // `base` comes from the member's roles (what they can do); `role` adds any
      // display-only title such as Senior Lead (shown, never a permission).
      const base = memberRoleLabel(m);
      const title = memberTitle(m.email);
      const role = memberDisplayRole(m);
      return {
        loginEmail: lc(m.email),
        name: memberFullName(m),
        role,
        group: m.group ? PROJECT_GROUP_LABELS[m.group] : "Not assigned yet",
        email: o?.contactEmail ?? m.email,
        phone: formatPhone(o?.phone ?? m.phone ?? ""),
        year: memberYear(m.email),
        positionCategory: categoryFor(base, title),
        positionRank: rankFor(base, title),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
