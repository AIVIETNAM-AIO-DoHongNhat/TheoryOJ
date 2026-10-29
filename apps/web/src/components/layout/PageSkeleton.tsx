import { Skeleton } from "@/components/ui/skeleton";

/** Khung chờ cho trang con trong lúc đọc tham số đường dẫn. */
export function PageSkeleton() {
  return (
    <>
      <div className="border-b bg-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:py-12">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-12">
        <Skeleton className="h-5 w-full max-w-3xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
    </>
  );
}
