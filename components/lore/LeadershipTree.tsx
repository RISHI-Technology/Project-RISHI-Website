"use client";

// One year's leadership tree, drawn with the Lineage tree's own markup and CSS
// (.familytree connectors, .ft-* palette, dark mode). Each node is a role card with
// one name per holder; a name opens that person's Full Directory profile in a new
// tab, and the viewer's own name is marked "You" (only the name, like Lineage).
// The layout comes from lib/leadership/tree.ts (slots → edges).
//
// COMPACT LAYOUT: drawn as one long row, most years are 1,400–2,200px wide. So roles
// that hang under the same parent and have nothing beneath them (a VP's directors, a
// projects director's leads) share one grid under a single connector. Fitting, in
// order, until the year fits the space:
//   1. the grids drop from MAX_COLS columns down to one (every year fits on desktop);
//   2. "dense": tighter spacing, narrower cards, long names may wrap (phones);
//   3. a gentle shrink, never below MIN_SCALE.
// Anything wider still pans sideways like Lineage (edge fades, a hint, mouse drag).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildTree, type TreeNode } from "@/lib/leadership/tree";
import type { LeadershipHolder, LeadershipRole, LeadershipYear } from "@/lib/leadership/types";

const MAX_COLS = 4;
const MIN_SCALE = 0.75;

type Ctx = {
  holdersOf: Map<string, LeadershipHolder[]>;
  hrefOf: (h: LeadershipHolder) => string | null;
  meId: string | null;
  cols: number;
};

export default function LeadershipTree({ year, roles, holders, hrefOf, meId, label }: {
  year: LeadershipYear;
  roles: LeadershipRole[];
  holders: LeadershipHolder[];
  /** Profile link for a holder (null = not linked: shown as plain text). */
  hrefOf: (h: LeadershipHolder) => string | null;
  meId: string | null;
  label?: string;
}) {
  const yearRoles = useMemo(() => roles.filter((r) => r.year === year.year), [roles, year.year]);
  const tree = useMemo(() => buildTree(year.structure, yearRoles), [year.structure, yearRoles]);
  const holdersOf = useMemo(() => {
    const m = new Map<string, LeadershipHolder[]>();
    for (const h of holders) m.set(h.roleId, [...(m.get(h.roleId) ?? []), h]);
    for (const list of m.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return m;
  }, [holders]);
  // Anything that changes the drawing's size restarts the fitting.
  const sig = useMemo(() => {
    const ids = new Set(yearRoles.map((r) => r.id));
    return JSON.stringify([
      year.year, year.structure,
      yearRoles.map((r) => [r.id, r.title, r.slot, r.projectGroup, r.parentRoleId, r.sortOrder]),
      holders.filter((h) => ids.has(h.roleId)).map((h) => [h.id, h.name, h.qualifier, h.sortOrder, h.personId === meId]),
    ]);
  }, [year.year, year.structure, yearRoles, holders, meId]);

  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setAvail(Math.round(el.clientWidth));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAvail(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- fitting: fewer grid columns, then dense, then a gentle shrink.
  type Fit = { key: string; cols: number; dense: boolean; scale: number; w: number; h: number };
  const key = `${sig}|${avail}`;
  const start = (k: string): Fit => ({ key: k, cols: MAX_COLS, dense: false, scale: 1, w: 0, h: 0 });
  const [fitState, setFit] = useState<Fit>(() => start(""));
  const fit: Fit = fitState.key === key ? fitState : start(key);
  useLayoutEffect(() => {
    const el = scroller.current, t = inner.current;
    if (!el || !t || !avail) return;
    if (fitState.key !== key) { setFit(fit); return; }
    if (fit.scale !== 1) return; // settled on a shrink
    const w = t.offsetWidth, h = t.offsetHeight;
    if (w <= avail + 1) return; // fits
    if (fit.cols > 1) { setFit({ ...fit, cols: fit.cols - 1 }); return; }
    if (!fit.dense) { setFit({ ...fit, dense: true }); return; }
    const s = Math.max(MIN_SCALE, avail / w);
    if (s < 1) setFit({ ...fit, scale: s, w, h });
  });

  // ---- still wider than the screen: pan sideways (fades + hint + mouse drag).
  const [edges, setEdges] = useState({ left: false, right: false });
  const measureEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  const centred = useRef("");
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && centred.current !== key && el.scrollWidth > el.clientWidth + 2) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; // open on the top of the tree
      centred.current = key;
    }
    measureEdges();
  });
  useEffect(() => {
    window.addEventListener("resize", measureEdges);
    return () => window.removeEventListener("resize", measureEdges);
  }, [measureEdges]);

  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const overflow = edges.left || edges.right;

  if (!tree.length) return <p className="py-10 text-center text-sm text-ink/60">No roles recorded for this year yet.</p>;

  const ctx: Ctx = { holdersOf, hrefOf, meId, cols: fit.cols };
  const shrunk = fit.scale < 1;
  const fade = `linear-gradient(to right, ${edges.left ? "transparent 0, #000 48px" : "#000 0"}, ${edges.right ? "#000 calc(100% - 48px), transparent 100%" : "#000 100%"})`;
  return (
    <>
      <div
        ref={scroller}
        className={`overflow-x-auto pb-3 ${overflow ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
        style={overflow ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
        tabIndex={0}
        role="region"
        aria-label={label ?? "Leadership tree"}
        data-lore-tree
        data-cols={fit.cols}
        data-dense={fit.dense ? "1" : "0"}
        data-scale={fit.scale.toFixed(2)}
        onScroll={measureEdges}
        onPointerDown={(e) => {
          const el = scroller.current;
          if (!el || !overflow || e.pointerType !== "mouse" || e.button !== 0) return;
          drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current, el = scroller.current;
          if (!d || !el) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 4) d.moved = true;
          if (d.moved) el.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => { dragged.current = !!drag.current?.moved; drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
        onClickCapture={(e) => {
          if (dragged.current) { e.preventDefault(); e.stopPropagation(); } // a drag is not a click on a name
          dragged.current = false;
        }}
        onDragStart={(e) => e.preventDefault()} // links shouldn't start a native drag while panning
      >
        {/* When shrunk, this box is exactly the shrunk size; overflow is clipped because the
            browser otherwise still counts the unshrunk layout width as scrollable. */}
        <div style={shrunk ? { width: Math.ceil(fit.w * fit.scale), height: Math.ceil(fit.h * fit.scale), margin: "0 auto", overflow: "hidden" } : undefined}>
          <div
            ref={inner}
            className={`familytree familytree--leadership ${fit.dense ? "familytree--dense" : ""}`}
            style={shrunk ? { width: fit.w, transform: `scale(${fit.scale})`, transformOrigin: "top left" } : undefined}
          >
            <ul>
              {tree.map((n) => <Branch key={n.key} node={n} ctx={ctx} depth={0} />)}
            </ul>
          </div>
        </div>
      </div>
      {overflow && (
        <p className="mt-1 text-center text-xs text-ink/50" data-tree-hint>
          This year is wider than the screen. Drag, swipe or scroll sideways to see all of it.
        </p>
      )}
    </>
  );
}

function Branch({ node, ctx, depth }: { node: TreeNode; ctx: Ctx; depth: number }) {
  return (
    <li>
      <RoleCard node={node} ctx={ctx} />
      {node.children.length > 0 && <Children nodes={node.children} ctx={ctx} depth={depth + 1} />}
    </li>
  );
}

/** Fits in a grid cell: a childless role, or a role with exactly one childless role
 *  beneath it (a director and their interns), drawn as a short vertical stack. */
const gridable = (n: TreeNode) => n.children.length === 0 || (n.children.length === 1 && n.children[0].children.length === 0);

/** A node's children. Below the top level, two or more grid-able roles share one grid
 *  (one connector); everything else keeps its own branch. The top level (VPs and the
 *  projects director) always keeps the plain tree shape. */
function Children({ nodes, ctx, depth }: { nodes: TreeNode[]; ctx: Ctx; depth: number }) {
  const cells = depth >= 2 ? nodes.filter(gridable) : [];
  const grouped = cells.length >= 2 ? new Set(cells) : new Set<TreeNode>();
  const items: ({ kind: "group"; nodes: TreeNode[] } | { kind: "node"; node: TreeNode })[] = [];
  for (const n of nodes) {
    if (!grouped.has(n)) items.push({ kind: "node", node: n });
    else if (n === cells[0]) items.push({ kind: "group", nodes: cells });
  }
  return (
    <ul>
      {items.map((it) =>
        it.kind === "node" ? (
          <Branch key={it.node.key} node={it.node} ctx={ctx} depth={depth} />
        ) : (
          <li key={`g:${it.nodes[0].key}`}>
            <div className="ft-group" style={{ gridTemplateColumns: `repeat(${Math.min(ctx.cols, it.nodes.length)}, auto)` }} data-role-group>
              {it.nodes.map((n) =>
                n.children.length === 0 ? (
                  <RoleCard key={n.key} node={n} ctx={ctx} />
                ) : (
                  <div key={n.key} className="ft-stack" data-role-stack>
                    <RoleCard node={n} ctx={ctx} />
                    <span className="ft-stack__line" aria-hidden />
                    <RoleCard node={n.children[0]} ctx={ctx} />
                  </div>
                ),
              )}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

function RoleCard({ node, ctx }: { node: TreeNode; ctx: Ctx }) {
  return (
    <div className="ft-card" data-role-card={node.roles.map((r) => r.title).join(" + ")}>
      {node.roles.map((role) => {
        const list = ctx.holdersOf.get(role.id) ?? [];
        return (
          <div key={role.id} className="ft-card__section">
            <p className="ft-card__title">{role.title}</p>
            {list.map((h) => <Name key={h.id} holder={h} role={role} ctx={ctx} />)}
            {!list.length && <span className="ft-card__empty">No one recorded</span>}
          </div>
        );
      })}
    </div>
  );
}

function Name({ holder: h, role, ctx }: { holder: LeadershipHolder; role: LeadershipRole; ctx: Ctx }) {
  const href = ctx.hrefOf(h);
  const me = !!ctx.meId && h.personId === ctx.meId;
  const body = (
    <>
      <span className="ft-chip__name">
        {h.name}
        {me && <span className="ft-badge">You</span>}
      </span>
      {h.qualifier && <span className="ft-chip__q">{h.qualifier}</span>}
    </>
  );
  const cls = `ft-chip ${me ? "ft-chip--me" : ""} ${href ? "" : "ft-chip--static"}`;
  if (!href) return <span className={cls} title={h.note ?? undefined}>{body}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
      title={[h.note, "Opens their Full Directory profile in a new tab"].filter(Boolean).join(" · ")}
      aria-label={`${h.name}${me ? " (you)" : ""}, ${role.title}${h.qualifier ? `, ${h.qualifier}` : ""}${h.note ? `. Note: ${h.note}` : ""}. Opens their Full Directory profile in a new tab`}
      data-holder={h.name}
    >
      {body}
    </a>
  );
}
