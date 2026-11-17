import { redirect } from "next/navigation";

// The Lineage page moved into RISHI Lore. Old links (bookmarks, shared URLs) land
// on Lore → Lineages, which shows the same trees.
export default function LineageRedirect() {
  redirect("/dashboard/lore?tab=lineages");
}
