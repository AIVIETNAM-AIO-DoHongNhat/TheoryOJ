import type { Metadata } from "next";
import { Suspense } from "react";

import { DEFAULT_SUBJECT, getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { ChatApp } from "@/features/chat/components/ChatApp";
import { ChatShell, ChatSkeleton } from "@/features/chat/components/ChatShell";
import { MODE_IDS, type ModeId } from "@/features/chat/modes";
import { suggestionsBySubject } from "@/features/learning/server/profile";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Trợ lý" };

type SearchParams = PageProps<"/tro-ly">["searchParams"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Nhận ?mon=...&che-do=...&chuong=3,5&q=... để các trang bài học, thư viện, bài viết mở sẵn trợ lý đúng ngữ cảnh.
async function Chat({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    // Đăng nhập xong quay lại đúng câu hỏi, môn, chế độ đã chọn sẵn.
    const query = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
        <StudentGate user={user} next={`/tro-ly${query.size ? `?${query}` : ""}`} action="hỏi trợ lý" />
      </div>
    );
  }

  const requested = getSubject(first(params.mon) ?? "");
  const subject = requested?.active ? requested : getSubject(DEFAULT_SUBJECT)!;
  const modeParam = first(params["che-do"]) as ModeId;
  const mode: ModeId = MODE_IDS.includes(modeParam) && subject.modes.includes(modeParam) ? modeParam : subject.modes[0];
  const chapters = (first(params.chuong) ?? "")
    .split(",")
    .map(Number)
    .filter((n) => subject.chapters.some((c) => c.number === n));

  return (
    <ChatApp
      initialSubject={subject.id}
      suggestions={suggestionsBySubject()}
      initialMode={mode}
      initialChapters={chapters}
      initialQuestion={(first(params.q) ?? "").slice(0, 1500)}
    />
  );
}

export default function TroLyPage({ searchParams }: PageProps<"/tro-ly">) {
  return (
    <ChatShell>
      <Suspense fallback={<ChatSkeleton />}>
        <Chat searchParams={searchParams} />
      </Suspense>
    </ChatShell>
  );
}
