import { BookOpen, Check, MessageSquareText, X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReviewItem } from "../types";

const LETTERS = "ABCDEF";

/** Bài đã nộp: đáp án đúng, phương án đã chọn, giải thích và trang giáo trình. */
export function ExamReview({
  items,
  subject,
  pageHref,
}: {
  items: ReviewItem[];
  subject: string;
  /** Đường dẫn tới trang giáo trình theo trang in, nếu môn có giáo trình. */
  pageHref: ((page: number) => string) | null;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={item.key}>
          <Card className={item.correct ? "ring-primary/40" : "ring-destructive/40"}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                Câu {i + 1}
                <Badge variant={item.correct ? "secondary" : "destructive"}>
                  {item.correct ? "Đúng" : item.chosen === null ? "Bỏ trống" : "Sai"}
                </Badge>
                <span className="ml-auto text-xs">Chương {item.chapter}</span>
              </CardDescription>
              <CardTitle className="text-base leading-snug sm:text-lg">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2">
                {item.options.map((o, j) => {
                  const isAnswer = o.key === item.answer;
                  const wrongChoice = !item.correct && o.key === item.chosen;
                  return (
                    <li
                      key={o.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
                        isAnswer && "border-primary bg-primary-soft",
                        wrongChoice && "border-destructive/60 bg-destructive/5",
                      )}
                    >
                      <span className="font-semibold text-muted-foreground">{LETTERS[j]}.</span>
                      <span className="flex-1">{o.text}</span>
                      {isAnswer && <Check className="size-4 text-primary" aria-label="Đáp án đúng" />}
                      {wrongChoice && <X className="size-4 text-destructive" aria-label="Đáp án đã chọn" />}
                    </li>
                  );
                })}
              </ul>
              {(item.explain || item.page || !item.correct) && (
                <div className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-sm leading-relaxed">
                  {item.explain && <p>{item.explain}</p>}
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {item.page && pageHref && (
                      <Link href={pageHref(item.page)} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                        <BookOpen className="size-4" />
                        Giáo trình, tr. {item.page}
                      </Link>
                    )}
                    {!item.correct && (
                      <Link
                        href={`/tro-ly?mon=${subject}&che-do=qa&chuong=${item.chapter}&q=${encodeURIComponent(`Giải thích giúp tôi: ${item.q}`)}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        <MessageSquareText className="size-4" />
                        Hỏi trợ lý về câu này
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
