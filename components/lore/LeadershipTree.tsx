"use client";

// One year's leadership tree, drawn with the Lineage tree's own markup and CSS
// (.familytree connectors, .ft-* palette, dark mode) — only the node differs: a
// role card with one clickable name chip per holder. The layout comes from
// lib/leadership/tree.ts (slots → edges); nothing here decides structure.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildTree, type TreeNode } from "@/lib/leadership/tree";
import type { LeadershipHolder, LeadershipRole, LeadershipYear } from "@/lib/leadership/types";

export default function LeadershipTree({ year, roles, holders, onPick, label }: {
  year: LeadershipYear;
  roles: LeadershipRole[];
  holders: LeadershipHolder[];
  onPick: (h: LeadershipHolder) => void;
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

  // Most years are wider than the screen (1,400–2,200px), and shrinking them to fit
  // makes names unreadable — so, like Lineage, the tree pans sideways. It opens on
  // the top of the tree (centred), fades the edge(s) with more to see, and mouse
  // users can drag it (a drag never counts as a click on a name).
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    measure();
  }, [year.year, measure]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const overflow = edges.left || edges.right;

  if (!tree.length) return <p className="py-10 text-center text-sm text-ink/60">No roles recorded for this year yet.</p>;

  const fade = `linear-gradient(to right, ${edges.left ? "transparent 0, #000 48px" : "#000 0"}, ${edges.right ? "#000 calc(100% - 48px), transparent 100%" : "#000 100%"})`;
  return (
    <>
      <div
        ref={scroller}
        className={`overflow-x-auto pb-3 ${overflow ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
        style={overflow ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
        tabIndex={0}
        role="region"
        aria-label={label ?? "Leadership tree (scrolls sideways)"}
        data-lore-tree
        onScroll={measure}
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
          if (dragged.current) { e.preventDefault(); e.stopPropagation(); }
          dragged.current = false;
        }}
      >
        <div className="familytree">
          <ul>
            {tree.map((n) => <Branch key={n.key} node={n} holdersOf={holdersOf} onPick={onPick} />)}
          </ul>
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

function Branch({ node, holdersOf, onPick }: {
  node: TreeNode; holdersOf: Map<string, LeadershipHolder[]>; onPick: (h: LeadershipHolder) => void;
}) {
  return (
    <li>
      <RoleCard node={node} holdersOf={holdersOf} onPick={onPick} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => <Branch key={c.key} node={c} holdersOf={holdersOf} onPick={onPick} />)}
        </ul>
      )}
    </li>
  );
}

function RoleCard({ node, holdersOf, onPick }: {
  node: TreeNode; holdersOf: Map<string, LeadershipHolder[]>; onPick: (h: LeadershipHolder) => void;
}) {
  return (
    <div className="ft-card" data-role-card={node.roles.map((r) => r.title).join(" + ")}>
      {node.roles.map((role) => {
        const list = holdersOf.get(role.id) ?? [];
        return (
          <div key={role.id} className="ft-card__section">
            <p className="ft-card__title">{role.title}</p>
            {list.map((h) => (
              <button
                key={h.id}
                type="button"
                className="ft-chip"
                onClick={() => onPick(h)}
                aria-label={`${h.name}, ${role.title}${h.qualifier ? ` (${h.qualifier})` : ""}. Open history`}
              >
                <span>{h.name}</span>
                {h.qualifier && <span className="ft-chip__q">{h.qualifier}</span>}
              </button>
            ))}
            {!list.length && <span className="ft-card__empty">No one recorded</span>}
          </div>
        );
      })}
    </div>
  );
}
