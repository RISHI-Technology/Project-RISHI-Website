import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { getMessage, isChatMember, toggleReaction } from "@/lib/lms/chat";

export const dynamic = "force-dynamic";

const ALLOWED = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  let body: { messageId?: string; emoji?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { messageId, emoji } = body;
  if (!messageId || !emoji) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!ALLOWED.includes(emoji)) return NextResponse.json({ error: "Unsupported reaction" }, { status: 400 });

  const msg = await getMessage(messageId);
  if (!msg || msg.chatId !== params.id)
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  if (!(await isChatMember(params.id, me.email)))
    return NextResponse.json({ error: "Not your chat." }, { status: 403 });

  const updated = await toggleReaction(messageId, me.email, emoji);
  return NextResponse.json({ message: updated });
}
