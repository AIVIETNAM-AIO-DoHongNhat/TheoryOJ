import { ImageIcon } from "lucide-react";
import Image from "next/image";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { Photo } from "@/features/landing/content";
import { cn } from "@/lib/utils";

/** Ô ảnh của Khoa: có `src` thì hiện ảnh, chưa có thì hiện khung chờ kèm đường dẫn cần đặt file. */
export function PhotoSlot({
  photo,
  sizes,
  priority,
  className,
}: {
  photo: Photo;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn("relative overflow-hidden rounded-xl bg-subtle text-foreground", className)}>
      {photo.src ? (
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <Empty className="absolute inset-0 border border-primary/25">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-11 rounded-lg border bg-white text-primary">
              <ImageIcon className="size-5" strokeWidth={1.75} />
            </EmptyMedia>
            <EmptyTitle>{photo.alt}</EmptyTitle>
            <EmptyDescription className="font-mono text-xs">{photo.hint}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </figure>
  );
}
