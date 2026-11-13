import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/lms/currentUser";
import { findMember, memberFullName } from "@/lib/members";
import { getChat, hideChatForUser, isChatMember, listMessages, sendMessage } from "@/lib/lms/chat";
import { sendPushToUser } from "@/lib/lms/push";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!(await isChatMember(params.id, me.email)))
    return NextResponse.json({ error: "Not your chat." }, { status: 403 });

  const chat = await getChat(params.id);
  const messages = await listMessages(params.id);
  return NextResponse.json({ chat, messages });
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!(await isChatMember(params.id, me.email)))
    return NextResponse.json({ error: "Not your chat." }, { status: 403 });

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Message too long." }, { status: 400 });

  const message = await sendMessage(params.id, me.email, text);

  // Background push to the OTHER members so they're alerted with the tab closed.
  const chat = await getChat(params.id);
  if (chat) {
    const senderName = memberFullName(findMember(me.email) ?? ({} as never)) || me.email;
    const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text;
    const others = chat.memberEmails.filter((e) => e.toLowerCase() !== me.email.toLowerCase());
    await Promise.allSettled(
      others.map((email) =>
        sendPushToUser(email, {
          title: chat.isGroup ? `${senderName} · ${chat.title ?? "Group chat"}` : senderName,
          body: preview,
          url: "/dashboard",
        }),
      ),
    );
  }

  return NextResponse.json({ message });
}

// Delete the conversation for the current member only (hides it from their list).
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!(await isChatMember(params.id, me.email)))
    return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  await hideChatForUser(params.id, me.email);
  return NextResponse.json({ ok: true });
}
