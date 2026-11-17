import { Suspense } from "react";
import LoreView from "@/components/lore/LoreView";

// /dashboard/lore?tab=lineages (default) | ?tab=leadership&year=2024-2025
export default function LorePage() {
  return (
    <Suspense fallback={null}>
      <LoreView />
    </Suspense>
  );
}
