import { ArrowRight, BookOpen, Check, ChevronRight, Library, MessageSquareText, Newspaper } from "lucide-react";
import Link from "next/link";

import { IconTile, SectionHeading } from "@/components/brand";
import { PhotoSlot } from "@/components/brand/PhotoSlot";
import { Reveal } from "@/components/brand/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_SUBJECT, getSubject, SUBJECTS } from "@/config/subjects";
import { MODE_ICONS } from "@/features/chat/mode-icons";
import { MODE_IDS, MODES } from "@/features/chat/modes";
import { PostCard } from "@/features/blog/components/PostCard";
import type { Post } from "@/features/blog/types";
import { KIND_ICONS } from "@/features/library/components/DocIcon";
import { type LibraryDoc, printedPage } from "@/features/library/types";
import { cn } from "@/lib/utils";

import { about, cta, facultySection, faq, features, latestPosts, materials, photos, principles, quickLinks, roadmap } from "../content";

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------ Lối vào nhanh ------------------------------ */

const QUICK_ICONS = [BookOpen, Library, Newspaper, MessageSquareText];

export function QuickLinksSection() {
  return (
    <section className="border-b">
      <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q, i) => (
          <Link key={q.href} href={q.href} className="group flex flex-col gap-3 bg-white px-4 py-8 transition-colors hover:bg-primary-soft sm:px-6">
            <IconTile icon={QUICK_ICONS[i]} />
            <span className="flex items-center gap-1.5 font-heading text-lg font-bold group-hover:text-primary">
              {q.title}
              <ArrowRight className="size-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </span>
            <span className="text-sm leading-relaxed text-muted-foreground">{q.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Bài viết mới ------------------------------ */

export function LatestPostsSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <Section className="border-t bg-subtle">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <SectionHeading overline={latestPosts.overline} title={latestPosts.title} />
        </Reveal>
        <Button variant="outline" render={<Link href="/bai-viet" />} nativeButton={false} className="self-start bg-white md:self-auto">
          {latestPosts.more}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 80}>
            <PostCard post={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

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

/* ------------------------------ Chức năng ------------------------------ */

export function FeaturesSection() {
  return (
    <Section id="tro-ly" className="border-y bg-subtle">
      <Reveal>
        <SectionHeading overline={features.overline} title={features.title} lead={features.lead} />
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {MODE_IDS.map((id, i) => {
            return (
              <div key={id} className="flex flex-col gap-4 bg-white p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <IconTile icon={MODE_ICONS[id]} />
                  <span className="font-heading text-sm font-bold text-muted-foreground/60">{pad(i + 1)}</span>
                </div>
                <h3 className="text-lg font-bold">{MODES[id].label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{MODES[id].description}</p>
                <ul className="flex flex-col gap-2 border-t pt-4">
                  {features.bullets[id].map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13px] leading-snug">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="link"
                  size="sm"
                  render={<Link href={`/tro-ly?che-do=${id}`} />}
                  nativeButton={false}
                  className="mt-auto self-start px-0"
                >
                  Mở chế độ này
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            );
          })}
        </div>
      </Reveal>
      <Button size="lg" render={<Link href="/tro-ly" />} nativeButton={false} className="mt-8 h-11 px-5">
        <MessageSquareText data-icon="inline-start" />
        Mở trợ lý học tập
      </Button>
    </Section>
  );
}

/* ------------------------------ Học liệu ------------------------------ */

export function MaterialsSection({ textbook, documents }: { textbook?: LibraryDoc; documents: LibraryDoc[] }) {
  const subject = getSubject(DEFAULT_SUBJECT)!;
  return (
    <Section id="hoc-lieu">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <SectionHeading overline={materials.overline} title={materials.title} lead={materials.lead} />
        </Reveal>
        <Button variant="outline" render={<Link href="/thu-vien" />} nativeButton={false} className="self-start md:self-auto">
          Vào thư viện
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div className="mt-14 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <Reveal className="flex flex-col gap-4">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {materials.textbookLabel} · {subject.name}
          </h3>
          <Card className="gap-0 py-0">
            {subject.chapters.map((c, i) => {
              const range = textbook?.chapters.find((x) => x.number === c.number);
              return (
                <div key={c.number}>
                  {i > 0 && <Separator />}
                  <Link
                    href={`/mon/${subject.id}/chuong/${c.number}`}
                    className="group flex items-center gap-5 px-5 py-4 transition-colors hover:bg-primary-soft"
                  >
                    <span className="w-8 shrink-0 font-heading text-lg font-bold text-primary">{pad(c.number)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] leading-snug group-hover:text-primary">{c.title}</span>
                      {textbook && range && (
                        <span className="text-xs text-muted-foreground">
                          Tr. {printedPage(textbook, range.from)}–{printedPage(textbook, range.to)}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </div>
              );
            })}
          </Card>
        </Reveal>
        <Reveal delay={80} className="flex flex-col gap-4">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{materials.documentsLabel}</h3>
          <ul className="flex flex-col">
            {documents.map((d) => {
              const Icon = KIND_ICONS[d.kind];
              return (
                <li key={d.slug} className="border-b first:pt-1">
                  <Link href={`/thu-vien/${d.slug}`} className="group flex items-start gap-3 py-4">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <span className="text-[15px] font-medium leading-snug group-hover:text-primary">{d.title}</span>
                  </Link>
                </li>
              );
            })}
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

/* ------------------------------ Ảnh hoạt động của Khoa ------------------------------ */

export function FacultySection() {
  return (
    <Section>
      <Reveal>
        <SectionHeading overline={facultySection.overline} title={facultySection.title} lead={facultySection.lead} />
      </Reveal>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {photos.gallery.map((p, i) => (
          <Reveal key={p.hint} delay={i * 80}>
            <PhotoSlot photo={p} sizes="(min-width: 768px) 360px, 100vw" className="aspect-[4/3]" />
            {p.src && <p className="mt-3 text-sm text-muted-foreground">{p.alt}</p>}
          </Reveal>
        ))}
      </div>
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

/* ------------------------------ Kêu gọi ------------------------------ */

export function CtaSection() {
  return (
    <Section className="border-t py-16 sm:py-20">
      <Reveal>
        <div className="flex flex-col gap-8 border-l-4 border-primary pl-6 md:flex-row md:items-center md:justify-between sm:pl-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold sm:text-3xl">{cta.title}</h2>
            <p className="text-muted-foreground">{cta.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href={cta.primary.href} />} nativeButton={false} className="h-11 px-5">
              {cta.primary.label}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href={cta.secondary.href} />} nativeButton={false} className="h-11 px-5">
              {cta.secondary.label}
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
