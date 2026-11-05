import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { NotebookWorkspace } from "@/features/notebooks/components/NotebookWorkspace";
import { getNotebook, getPage, listNotebooks, listPages } from "@/features/notebooks/server/notebooks";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

// Sổ riêng của từng học viên, không có phần nào dựng sẵn được.
export const instant = false;

export const metadata: Metadata = { title: "Sổ ghi chép", robots: { index: false } };

type Props = PageProps<"/so-ghi-chep/[id]">;

async function Workspace({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <StudentGate user={user} next={`/so-ghi-chep/${id}`} action="mở sổ ghi chép" />
      </div>
    );
  }
  const notebookId = Number(id);
  if (!Number.isSafeInteger(notebookId) || notebookId <= 0) notFound();
  const notebook = await getNotebook(user.visitorId, notebookId);
  if (!notebook) notFound();

  const wanted = Number(typeof sp.trang === "string" ? sp.trang : NaN);
  const [pages, all] = await Promise.all([listPages(user.visitorId, notebook.id, notebook.pageOrder), listNotebooks(user.visitorId)]);
  // Mở trang trên đường dẫn nếu thuộc sổ này, không thì trang đầu danh sách.
  const pick = pages.find((p) => p.id === wanted) ?? pages[0];
  const page = pick ? await getPage(user.visitorId, pick.id) : null;

  return (
    <NotebookWorkspace
      notebook={notebook}
      initialPages={pages}
      initialPage={page}
      openedFromUrl={pick?.id === wanted}
      otherNotebooks={all.filter((n) => n.id !== notebook.id).map(({ id, title, color, icon }) => ({ id, title, color, icon }))}
    />
  );
}

export default function NotebookPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid h-[calc(100dvh-4.25rem)] max-w-[96rem] lg:grid-cols-[19rem_1fr]">
          <div className="flex flex-col gap-3 border-r p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <div className="hidden flex-col gap-4 p-8 lg:flex">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <Workspace {...props} />
    </Suspense>
  );
}
