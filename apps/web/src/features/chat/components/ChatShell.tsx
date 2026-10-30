import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";

/** Khung toàn màn hình của trợ lý: header ở trên, hội thoại chiếm phần còn lại. */
export function ChatShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Skeleton className="mx-auto size-14 rounded-full" />
      <Skeleton className="mx-auto h-9 w-2/3" />
      <Skeleton className="h-32 w-full rounded-3xl" />
    </div>
  );
}
