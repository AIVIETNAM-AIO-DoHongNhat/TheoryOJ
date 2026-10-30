import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getSubject } from "@/config/subjects";
import { ChatApp } from "@/features/chat/components/ChatApp";
import { ChatShell, ChatSkeleton } from "@/features/chat/components/ChatShell";
import { loadConversation } from "@/features/chat/server/persist";
import { getVisitorId } from "@/lib/visitor";

// Trang hoàn toàn theo trình duyệt và id, không có phần nào dựng sẵn được: cho phép chặn khi điều hướng.
export const instant = false;

export const metadata: Metadata = { title: "Trợ lý" };

async function SavedChat({ params }: { params: PageProps<"/tro-ly/[id]">["params"] }) {
  const { id } = await params;
  // Chỉ trình duyệt đã tạo hội thoại mới mở lại được.
  const visitorId = await getVisitorId();
  const conversation = visitorId ? await loadConversation(id, visitorId) : null;
  if (!conversation) notFound();

  const subject = getSubject(conversation.subject);
  if (!subject?.active) notFound();

  return (
    <ChatApp
      key={id}
      initialSubject={subject.id}
      initialMode={conversation.lastMode ?? subject.modes[0]}
      initialChapters={conversation.lastChapters}
      initialQuestion=""
      conversation={{ id, messages: conversation.messages, feedback: conversation.feedback }}
    />
  );
}

export default function SavedChatPage({ params }: PageProps<"/tro-ly/[id]">) {
  return (
    <ChatShell>
      <Suspense fallback={<ChatSkeleton />}>
        <SavedChat params={params} />
      </Suspense>
    </ChatShell>
  );
}
