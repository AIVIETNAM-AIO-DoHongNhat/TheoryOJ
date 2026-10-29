"use client";

import { Menu, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AcademyLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { ASSISTANT, isActive, NAV } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Mở menu" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <AcademyLogo className="drop-shadow-none" />
            <div className="flex flex-col">
              <SheetTitle className="font-heading">Khoa Lý luận chính trị</SheetTitle>
              <SheetDescription>Học viện An ninh nhân dân</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <Separator />
        <nav className="flex flex-col gap-1 px-4">
          {NAV.map((n) => (
            <div key={n.href} className="flex flex-col">
              <Button
                variant="ghost"
                size="lg"
                render={<Link href={n.href} onClick={close} />}
                nativeButton={false}
                className={cn("justify-start text-[15px]", isActive(pathname, n.href) && "bg-primary-soft text-primary")}
              >
                {n.label}
              </Button>
              {n.children && (
                <div className="ml-4 flex flex-col border-l pl-2">
                  {n.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={close}
                      className={cn(
                        "flex flex-col rounded-md px-3 py-2 text-sm hover:bg-muted",
                        pathname.startsWith(c.href) && "text-primary",
                        c.soon && "opacity-60",
                      )}
                    >
                      <span className="font-medium">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{c.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <Button size="lg" render={<Link href={ASSISTANT.href} onClick={close} />} nativeButton={false} className="w-full">
            <MessageSquareText data-icon="inline-start" />
            {ASSISTANT.label}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
