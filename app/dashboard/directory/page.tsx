"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CurrentMembers from "./CurrentMembers";
import FullDirectory from "@/components/fullDirectory/FullDirectory";
import ViewSwitcher from "@/components/fullDirectory/ViewSwitcher";

// Member Directory: two views behind one entry point.
//   /dashboard/directory            → Current Members (unchanged existing view)
//   /dashboard/directory?view=full  → Full Directory (every member, 2015–2027)
function DirectoryViews() {
  const view = useSearchParams().get("view") === "full" ? "full" : "current";
  const switcher = <ViewSwitcher active={view} />;
  return view === "full" ? <FullDirectory switcher={switcher} /> : <CurrentMembers switcher={switcher} />;
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={null}>
      <DirectoryViews />
    </Suspense>
  );
}
