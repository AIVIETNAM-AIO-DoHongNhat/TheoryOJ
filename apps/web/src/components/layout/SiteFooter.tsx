import Link from "next/link";

import { AcademyLogo } from "@/components/brand";
import { Separator } from "@/components/ui/separator";
import { footer, site } from "@/features/landing/content";

export function SiteFooter() {
  const contact = footer.contact.filter((c) => c.value);
  return (
    <footer className="mt-auto bg-forest text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-8 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <AcademyLogo className="size-12 drop-shadow-none" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">{site.ministry} · {site.unit}</span>
                <span className="font-heading text-lg font-bold text-white">{site.facultyShort}</span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed">{footer.tagline}</p>
            {contact.length > 0 && (
              <dl className="flex flex-col gap-1.5 text-sm">
                {contact.map((c) => (
                  <div key={c.label} className="flex gap-2">
                    <dt className="text-white/50">{c.label}:</dt>
                    <dd>{c.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {footer.columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="flex flex-col gap-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-mint">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="bg-white/10" />
        <div className="flex flex-col gap-3 text-xs text-white/50 md:flex-row md:justify-between">
          <span>© {site.year} {site.facultyShort}, {site.unit}</span>
          <span className="max-w-xl md:text-right">{footer.disclaimer}</span>
        </div>
      </div>
    </footer>
  );
}
