"use client";

// Lore → Lineages: the RISHI lineage ("bigs and littles") trees, moved here
// unchanged from the old /dashboard/lineage page (which now redirects to Lore).

import { useSession } from "next-auth/react";
import Reveal from "@/components/Reveal";
import {
  LINEAGES,
  orderLineagesFor,
  treeContains,
  type LineageNode,
} from "@/lib/lineage";

function TreeNode({
  node,
  userName,
}: {
  node: LineageNode;
  userName: string;
}) {
  const isUser = !!userName && node.name === userName;
  const kids = node.children ?? [];

  return (
    <li>
      <span className={`ft-node ${isUser ? "ft-node--me" : ""}`}>
        {node.name}
        {isUser && <span className="ft-badge">You</span>}
      </span>
      {kids.length > 0 && (
        <ul>
          {kids.map((child, i) => (
            <TreeNode key={`${child.name}-${i}`} node={child} userName={userName} />
          ))}
        </ul>
      )}
    </li>
  );
}

function LineageCard({
  tree,
  userName,
  isMine,
}: {
  tree: LineageNode;
  userName: string;
  isMine: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 ${
        isMine
          ? "border-marigold/50 bg-marigold/[0.06]"
          : "border-pine/12 bg-paper"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-sage-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-pine" />
            Lineage Head
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-pine-deep">
            {tree.name}
          </h3>
        </div>
        {isMine && (
          <span className="shrink-0 rounded-full bg-marigold px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-pine-deep">
            Your lineage
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Family tree (scrolls sideways)">
        <div className="familytree">
          <ul>
            <TreeNode node={tree} userName={userName} />
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LineagesView() {
  const { data: session } = useSession();
  const userName =
    session?.user?.firstName && session?.user?.lastName
      ? `${session.user.firstName} ${session.user.lastName}`
      : "";

  const ordered = orderLineagesFor(userName);

  return (
    <section className="container-rishi space-y-6 pb-14">
      {ordered.map((tree, i) => {
        const isMine = !!userName && treeContains(tree, userName);
        return (
          <Reveal key={tree.name} delay={i === 0 ? 0 : 0.05}>
            <LineageCard tree={tree} userName={userName} isMine={isMine} />
          </Reveal>
        );
      })}

      {LINEAGES.length === 0 && (
        <p className="text-center text-ink/75">No lineages have been added yet.</p>
      )}
    </section>
  );
}
