import { ArrowRight, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { PhotoSlot } from "@/components/brand/PhotoSlot";
import { Reveal } from "@/components/brand/Reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { hero, photos } from "../content";

/** Số liệu dưới hero lấy từ dữ liệu thật (manifest, thư mục bài viết), không ghi tay. */
export function Hero({ facts }: { facts: { value: string; label: string }[] }) {
  return (
    <section className="border-b bg-subtle">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-20">
        <Reveal className="flex flex-col items-start">
          <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-px w-8 bg-current" aria-hidden />
            {hero.overline}
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-[56px]">{hero.title}</h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{hero.lead}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href={hero.primary.href} />} nativeButton={false} className="h-11 px-5">
              {hero.primary.label}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href={hero.secondary.href} />} nativeButton={false} className="h-11 bg-white px-5">
              <MessageSquareText data-icon="inline-start" />
              {hero.secondary.label}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <PhotoSlot photo={photos.hero} priority sizes="(min-width: 1024px) 480px, 100vw" className="aspect-[4/3] lg:aspect-[5/6]" />
        </Reveal>
      </div>

      <div className="border-t bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={cn("flex flex-col gap-1 py-6 pr-4", i % 2 === 1 && "border-l pl-6", i > 1 && "border-t sm:border-t-0", i === 2 && "sm:border-l sm:pl-6")}
            >
              <dt className="order-2 text-sm text-muted-foreground">{f.label}</dt>
              <dd className="font-heading text-3xl font-bold text-primary">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
