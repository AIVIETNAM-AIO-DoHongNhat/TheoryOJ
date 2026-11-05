import { BookOpen, NotebookPen, Pin, Plus, TextSelect } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { NotebookCover } from "@/features/notebooks/components/NotebookCover";
import { NotebookSettingsDialog } from "@/features/notebooks/components/NotebookSettingsDialog";
import { listNotebooks } from "@/features/notebooks/server/notebooks";
import { notebookHref, NOTEBOOKS_MAX, PAPER_STYLES } from "@/features/notebooks/types";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sổ ghi chép", robots: { index: false } };

const newButton = (
  <Button size="lg">
    <Plus data-icon="inline-start" />
    Sổ mới
  </Button>
);

const TIPS = [
  { icon: NotebookPen, title: "Ghi sau mỗi buổi học", text: "Ý chính, công thức, câu hỏi còn vướng. Viết bằng Markdown, công thức đặt giữa hai dấu $." },
  { icon: TextSelect, title: "Chép từ giáo trình", text: "Bôi đen một đoạn trong thư viện, chọn “Vào sổ”. Đoạn trích được chép kèm số trang in để mở lại." },
  { icon: BookOpen, title: "Gắn với chương", text: "Sổ gắn môn thì mỗi trang chọn được chương, và hiện lại ở bài học của chương đó." },
];

async function Notebooks() {
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    return <StudentGate user={user} next="/so-ghi-chep" action="dùng sổ ghi chép" className="mx-auto max-w-3xl" />;
  }
  const notebooks = await listNotebooks(user.visitorId);

  if (!notebooks.length) {
    return (
      <div className="flex flex-col gap-10">
        <div className="grid gap-4 md:grid-cols-3">
          {TIPS.map((t) => (
            <div key={t.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <t.icon className="size-5" />
              </span>
              <h2 className="font-sans text-base font-semibold">{t.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t.text}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">Đồng chí chưa có sổ nào. Tạo một sổ, chọn màu bìa và kiểu giấy theo ý mình.</p>
          <NotebookSettingsDialog trigger={newButton} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {notebooks.map((nb) => (
          <li key={nb.id}>
            <Link href={notebookHref(nb.id)} className="group flex flex-col gap-3">
              <div className="relative aspect-3/4 w-full transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
                <NotebookCover color={nb.color} icon={nb.icon} size="lg" className="shadow-card group-hover:shadow-float" />
                {nb.pinned && (
                  <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm" aria-label="Đã ghim">
                    <Pin className="size-3.5" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/25 px-3 py-1.5 text-right text-[11px] font-medium text-white backdrop-blur-[2px]">
                  {nb.pageCount} trang · {PAPER_STYLES[nb.paper].label.toLowerCase()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">{nb.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {nb.description || (nb.subject ? getSubject(nb.subject)?.name : "Sổ chung")}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {notebooks.length < NOTEBOOKS_MAX && (
          <li>
            <NotebookSettingsDialog
              trigger={
                <button
                  type="button"
                  className="flex aspect-3/4 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
                >
                  <Plus className="size-6" />
                  Sổ mới
                </button>
              }
            />
          </li>
        )}
      </ul>
    </div>
  );
}

export default function NotebooksPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sổ ghi chép" }]}
        title="Sổ ghi chép"
        lead="Ghi lại điều đã học, chép đoạn giáo trình kèm số trang, sắp xếp theo sổ và theo chương. Sổ lưu theo tài khoản học viên, học trên máy nào cũng thấy."
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-3/4 rounded-lg" />
              ))}
            </div>
          }
        >
          <Notebooks />
        </Suspense>
      </div>
    </>
  );
}
