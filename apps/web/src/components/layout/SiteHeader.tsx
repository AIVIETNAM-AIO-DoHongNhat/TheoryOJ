import Link from "next/link";

import { AcademyLogo } from "@/components/brand";
import { site } from "@/features/landing/content";

import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";

/**
 * Đầu trang một dòng, dính ở đầu màn hình: logo và tên đơn vị, menu.
 * Nút Trợ lý học tập nằm ở cụm nút nổi góc phải (FloatingActions).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-t-[3px] border-t-primary bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <AcademyLogo priority className="size-11 drop-shadow-none" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{site.unit}</span>
            <span className="truncate font-heading text-lg font-bold uppercase tracking-[0.02em] text-primary">{site.facultyShort}</span>
          </span>
        </Link>
        <MainNav />
        <div className="flex items-center gap-2">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
