import { ArrowRight, Check } from "lucide-react";

import { SectionHeading } from "@/components/brand";
import { PhotoSlot } from "@/components/brand/PhotoSlot";
import { Reveal } from "@/components/brand/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { about, faq, photos, principles, roadmap } from "../content";

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------ Giới thiệu ------------------------------ */

export function AboutSection() {
  return (
    <Section id="gioi-thieu">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <PhotoSlot photo={photos.about} sizes="(min-width: 1024px) 560px, 100vw" className="aspect-[4/3]" />
        </Reveal>
        <Reveal delay={80} className="order-1 flex flex-col gap-8 lg:order-2">
          <SectionHeading overline={about.overline} title={about.title} />
          <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ul className="grid gap-x-6 gap-y-3 border-t pt-6 sm:grid-cols-2">
            {about.goals.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-sm font-medium">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                {g}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

/* ------------------------------ Nguyên tắc ------------------------------ */

export function PrinciplesSection() {
  return (
    <Section id="nguyen-tac" className="bg-forest">
      <Reveal>
        <SectionHeading dark overline={principles.overline} title={principles.title} lead={principles.lead} />
      </Reveal>
      <Reveal delay={80}>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {principles.items.map((p, i) => (
            <li key={p.title} className="flex gap-5 bg-forest p-6 sm:p-8">
              <span className="font-heading text-2xl font-bold text-mint">{pad(i + 1)}</span>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-white">{p.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-white/70">
          <span className="font-semibold text-white">Quy trình trả lời:</span>
          {principles.steps.map((s, i) => (
            <span key={s} className="flex items-center gap-4">
              {i > 0 && <ArrowRight className="size-4 text-mint/70" aria-hidden />}
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full border border-white/25 text-xs text-white">{i + 1}</span>
                {s}
              </span>
            </span>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* --------------------------- Hỏi đáp và lộ trình --------------------------- */

export function FaqSection() {
  return (
    <Section id="hoi-dap" className="border-t bg-subtle">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal className="flex flex-col gap-10">
          <SectionHeading overline={faq.overline} title={faq.title} />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold">{roadmap.title}</h3>
              <p className="text-sm text-muted-foreground">{roadmap.lead}</p>
            </div>
            <ol className="flex flex-col border-t">
              {SUBJECTS.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
                  <span className={cn(s.active ? "font-medium" : "text-muted-foreground")}>{s.name}</span>
                  <Badge variant={s.active ? "default" : "outline"}>{s.active ? "Đang triển khai" : "Sắp triển khai"}</Badge>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <Accordion className="rounded-xl border bg-white px-6">
            {faq.items.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="py-5 text-[15px] font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  );
}
