import { Calculator, ChartColumn, GraduationCap, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { quizCounts } from "@/features/quiz/server/bank";
import { QUIZ_SIZE } from "@/features/quiz/types";

export const metadata: Metadata = {
  title: "Ôn tập",
  description: "Trắc nghiệm theo chương, bài tập tính toán sinh số và bảng tiến độ cá nhân.",
};

export default function OnTapPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ôn tập" }]}
        title="Ôn tập theo chương"
        lead={`Mỗi đề trắc nghiệm gồm ${QUIZ_SIZE} câu lấy ngẫu nhiên trong ngân hàng câu hỏi của chương, có giải thích và trang giáo trình. Chương có công thức có thêm bài tập tính toán, số liệu đổi mỗi lần làm.`}
        actions={
          <Button variant="outline" className="bg-white" render={<Link href="/tien-do" />} nativeButton={false}>
            <ChartColumn data-icon="inline-start" />
            Tiến độ của tôi
          </Button>
        }
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:py-16">
        {ACTIVE_SUBJECTS.map((subject) => {
          const counts = quizCounts(subject.id, subject.chapters.map((c) => c.number));
          return (
            <section key={subject.id} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">{subject.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {Object.values(counts).reduce((a, b) => a + b, 0)} câu trắc nghiệm trong {Object.keys(counts).length} chương
                </p>
              </div>
              <Card className="gap-0 py-0">
                {subject.chapters.map((c, i) => {
                  const hasExercises = !!EXERCISES[subject.id]?.[c.number];
                  return (
                    <div key={c.number}>
                      {i > 0 && <Separator />}
                      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                        <span className="w-10 shrink-0 font-heading text-2xl font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <Link href={`/mon/${subject.id}/chuong/${c.number}`} className="text-base font-medium leading-snug hover:text-primary">
                            {c.title}
                          </Link>
                          <div className="flex flex-wrap gap-1.5">
                            {counts[c.number] && <Badge variant="secondary">{counts[c.number]} câu trắc nghiệm</Badge>}
                            {hasExercises && <Badge variant="secondary">Bài tập tính toán</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {counts[c.number] && (
                            <Button size="sm" render={<Link href={`/mon/${subject.id}/chuong/${c.number}/trac-nghiem`} />} nativeButton={false}>
                              <ListChecks data-icon="inline-start" />
                              Trắc nghiệm
                            </Button>
                          )}
                          {hasExercises && (
                            <Button size="sm" variant="outline" render={<Link href={`/mon/${subject.id}/chuong/${c.number}/bai-tap`} />} nativeButton={false}>
                              <Calculator data-icon="inline-start" />
                              Bài tập
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            render={<Link href={`/tro-ly?mon=${subject.id}&che-do=review&chuong=${c.number}`} />}
                            nativeButton={false}
                          >
                            <GraduationCap data-icon="inline-start" />
                            Ôn với trợ lý
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>
    </>
  );
}
