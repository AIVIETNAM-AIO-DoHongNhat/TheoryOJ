import { ArrowRight, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Subject } from "@/config/subjects";
import { cn } from "@/lib/utils";

/** Thẻ một môn học. Môn chưa mở vẫn hiện để người xem thấy lộ trình của Khoa. */
export function SubjectCard({ subject, docCount }: { subject: Subject; docCount: number }) {
  return (
    <div className={cn("flex h-full flex-col gap-4 rounded-xl border bg-white p-6", !subject.active && "bg-subtle")}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">{subject.shortName}</span>
        {subject.active ? <Badge>Đang triển khai</Badge> : <Badge variant="outline">Sắp triển khai</Badge>}
      </div>
      <h3 className={cn("text-xl font-bold leading-snug", !subject.active && "text-foreground/70")}>{subject.name}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{subject.description}</p>
      {subject.active ? (
        <>
          <p className="text-sm text-muted-foreground">
            {subject.chapters.length} chương · {docCount} tài liệu
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button render={<Link href={`/mon/${subject.id}`} />} nativeButton={false}>
              Vào học liệu
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link href={`/tro-ly?mon=${subject.id}`} />} nativeButton={false}>
              <MessageSquareText data-icon="inline-start" />
              Hỏi trợ lý
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-auto pt-2 text-sm text-muted-foreground">Học liệu đang được Khoa biên soạn.</p>
      )}
    </div>
  );
}
