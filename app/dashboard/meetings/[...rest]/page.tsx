import { redirect } from "next/navigation";

/**
 * Anything under the old /dashboard/meetings/… tree — a bookmarked meeting, a
 * link in an old email — lands on the same page in its new location.
 */
export default async function MeetingSubpathMoved(props: { params: Promise<{ rest: string[] }> }) {
  const params = await props.params;
  redirect(`/dashboard/files/meetings/${(params.rest ?? []).join("/")}`);
}
