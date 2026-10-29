import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { DEFAULT_SUBJECT, getSubject } from "@/config/subjects";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { MODE_IDS, type ModeId } from "@/features/chat/modes";

export const metadata: Metadata = { title: "Trợ lý" };

type SearchParams = PageProps<"/tro-ly">["searchParams"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Nhận ?mon=...&che-do=...&chuong=3,5&q=... để các trang học liệu, thư viện, bài viết mở sẵn trợ lý đúng ngữ cảnh.
async function Chat({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = getSubject(first(params.mon) ?? "");
  const subject = requested?.active ? requested : getSubject(DEFAULT_SUBJECT)!;
  const modeParam = first(params["che-do"]) as ModeId;
  const mode: ModeId = MODE_IDS.includes(modeParam) && subject.modes.includes(modeParam) ? modeParam : subject.modes[0];
  const chapters = (first(params.chuong) ?? "")
    .split(",")
    .map(Number)
    .filter((n) => subject.chapters.some((c) => c.number === n));

  return (
    <ChatWindow
      initialSubject={subject.id}
      initialMode={mode}
      initialChapters={chapters}
      initialQuestion={(first(params.q) ?? "").slice(0, 1500)}
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
