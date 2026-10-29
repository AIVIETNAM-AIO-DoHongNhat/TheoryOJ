"use client";

import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ASSISTANT } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { ScrollToTop } from "./ScrollToTop";

/** Cụm nút nổi góc phải: Trợ lý học tập ở trên, về đầu trang ở dưới. Trang trợ lý không cần nút mở trợ lý. */
export function FloatingActions() {
  const pathname = usePathname();
  const onAssistant = pathname.startsWith(ASSISTANT.href);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {!onAssistant && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                render={<Link href={ASSISTANT.href} />}
                nativeButton={false}
                aria-label={ASSISTANT.label}
                size="icon-lg"
                className="size-12 rounded-full shadow-[0_8px_24px_-8px_rgb(21_128_61/0.7)]"
              />
            }
          >
            <MessageSquareText className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="left">{ASSISTANT.label}</TooltipContent>
        </Tooltip>
      )}
      <ScrollToTop />
    </div>
  );
}
