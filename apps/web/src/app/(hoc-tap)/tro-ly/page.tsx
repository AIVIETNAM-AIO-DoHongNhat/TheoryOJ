import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { DEFAULT_SUBJECT, getSubject } from "@/config/subjects";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { MODE_IDS, type ModeId } from "@/features/chat/modes";
import { sampleQuestions } from "@/features/landing/content";

export const metadata: Metadata = { title: "Trợ lý" };

type SearchParams = PageProps<"/tro-ly">["searchParams"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Nhận ?q=...&che-do=...&chuong=3,5 để thẻ câu hỏi mẫu và thẻ chương ở landing page mở sẵn trợ lý.
async function Chat({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const subject = getSubject(DEFAULT_SUBJECT)!;
  const modeParam = first(params["che-do"]);
  const mode: ModeId = MODE_IDS.includes(modeParam as ModeId) ? (modeParam as ModeId) : "qa";
  const chapters = (first(params.chuong) ?? "")
    .split(",")
    .map(Number)
    .filter((n) => subject.chapters.some((c) => c.number === n));

  return (
    <ChatWindow
      subject={subject.id}
      subjectName={subject.name}
      chapters={subject.chapters}
      initialMode={mode}
      initialChapters={chapters}
      initialQuestion={(first(params.q) ?? "").slice(0, 1500)}
      suggestions={sampleQuestions.slice(0, 4)}
    />
  );
}

export default function TroLyPage({ searchParams }: PageProps<"/tro-ly">) {
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<p className="mx-auto mt-16 text-sm text-muted-foreground">Đang mở trợ lý…</p>}>
          <Chat searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
