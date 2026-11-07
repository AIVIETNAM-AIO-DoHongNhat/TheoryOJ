import { ArrowRight, BookOpenCheck, Check, Search } from "lucide-react";
import Image from "next/image";

import { AcademyLogo, SectionHeading } from "@/components/brand";
import { CountUp } from "@/components/brand/CountUp";
import { PhotoSlot } from "@/components/brand/PhotoSlot";
import { Reveal } from "@/components/brand/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { about, faculty, faq, photos, principles, roadmap, site, team, type Member } from "../content";

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

/* ------------------------------ Về Khoa ------------------------------ */

export function FacultySection() {
  const { need, answer } = faculty.story;
  const stats = [{ value: String(SUBJECTS.length), label: faculty.subjectsLabel }, ...faculty.stats.filter((s) => s.value)];
  return (
    <Section id="ve-khoa">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
        <Reveal className="flex flex-col gap-6 lg:col-span-7">
          <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-px w-8 bg-current" aria-hidden />
            {faculty.overline}
          </span>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]">
            {faculty.nameStart} <span className="text-primary sm:block">{faculty.nameAccent}</span>
          </h2>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-5 lg:pb-2">
          <p className="text-pretty text-lg leading-relaxed text-foreground/85">{faculty.lead}</p>
        </Reveal>
      </div>

      {/* Hai thẻ cao bằng nhau: nhu cầu (nền sáng) rồi lời giải (nền xanh đậm), mũi tên ở giữa chỉ chiều lập luận. */}
      <div className="relative mt-14 grid gap-4 md:grid-cols-2 md:gap-6">
        <Reveal className="h-full">
          <article className="flex h-full flex-col gap-5 rounded-3xl border bg-card p-7 sm:p-10">
            <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="grid size-9 place-items-center rounded-xl bg-subtle text-foreground">
                <Search className="size-4" strokeWidth={2.25} />
              </span>
              {need.label}
            </span>
            <h3 className="text-balance text-2xl font-bold leading-snug tracking-tight">{need.title}</h3>
            <p className="text-pretty text-[15px] leading-relaxed text-muted-foreground">{need.text}</p>
          </article>
        </Reveal>
        <Reveal delay={120} className="h-full">
          <article className="mesh-dark relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl p-7 text-white sm:p-10">
            <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-mint">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-mint">
                <BookOpenCheck className="size-4" strokeWidth={2.25} />
              </span>
              {answer.label}
            </span>
            <h3 className="text-balance text-2xl font-bold leading-snug tracking-tight">{answer.title}</h3>
            <p className="text-pretty text-[15px] leading-relaxed text-white/75">{answer.text}</p>
            <a
              href={answer.cta.href}
              className="group/cta mt-auto inline-flex w-fit items-center gap-2 pt-2 text-sm font-semibold text-mint transition-colors hover:text-white"
            >
              {answer.cta.label}
              <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-1" />
            </a>
          </article>
        </Reveal>
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-background text-primary shadow-sm md:grid"
        >
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </span>
      </div>

      <Reveal className="group mt-14 sm:mt-16">
        <figure>
          <div className="reveal-mask relative aspect-[4/3] overflow-hidden rounded-2xl bg-subtle md:aspect-[16/9]">
            <div className="reveal-zoom absolute inset-0">
              <PhotoSlot
                photo={photos.gallery[0]}
                sizes="(min-width: 1152px) 1120px, 100vw"
                className="h-full rounded-none [&_img]:object-[50%_96%] [&_img]:transition-transform [&_img]:duration-[1.6s] [&_img]:ease-out group-hover:[&_img]:scale-[1.03]"
              />
            </div>
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-forest/40 to-transparent" />
          </div>
          <figcaption className="mt-4 flex flex-col gap-3 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{faculty.photoCaption}</span>
            <span className="flex shrink-0 items-center gap-2 font-medium text-foreground">
              <AcademyLogo className="size-5 drop-shadow-none" />
              {site.facultyShort} · {site.unit}
            </span>
          </figcaption>
        </figure>
      </Reveal>

      <ol className="mt-16 grid border-t md:grid-cols-3">
        {faculty.duties.map((d, i) => (
          <li key={d.title} className={cn("group/duty relative border-b md:border-b-0", i > 0 && "md:border-l")}>
            <span aria-hidden className="absolute -top-px left-0 h-0.5 w-0 bg-primary transition-[width] duration-700 ease-out group-hover/duty:w-full" />
            <Reveal delay={i * 100} className={cn("flex flex-col gap-3 py-8", i > 0 && "md:pl-8", i < 2 && "md:pr-8")}>
              <span className="font-heading text-sm font-bold tracking-wider text-primary">{pad(i + 1)}</span>
              <h3 className="text-xl font-bold">{d.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{d.text}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal>
        <div className="mt-8 grid gap-10 rounded-2xl bg-subtle p-7 sm:p-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <dl className="flex flex-wrap gap-x-12 gap-y-6 lg:flex-col">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <dt className="order-2 max-w-[14rem] text-sm leading-snug text-muted-foreground">{s.label}</dt>
                <dd className="font-heading text-6xl font-extrabold leading-none tracking-tight text-primary">
                  <CountUp value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
          <ol className="grid content-center gap-x-10 sm:grid-cols-2">
            {SUBJECTS.map((s, i) => (
              <li key={s.id} className="flex items-baseline gap-4 border-b border-foreground/10 py-3.5">
                <span className="font-mono text-xs text-muted-foreground">{pad(i + 1)}</span>
                <span className="text-[15px] font-medium">{s.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </Section>
  );
}

/* ------------------------------ Nhóm thực hiện ------------------------------ */

/** Ô chân dung còn trống: bóng người mờ trên nền xanh đậm, kèm đường dẫn cần đặt file ảnh. */
function PortraitPlaceholder({ hint }: { hint: string }) {
  const slash = hint.lastIndexOf("/") + 1;
  return (
    <div className="absolute inset-0 bg-forest-2 bg-[radial-gradient(90%_60%_at_50%_25%,rgb(34_197_94/0.22),transparent_70%)]">
      <svg
        viewBox="0 0 120 160"
        aria-hidden
        className="absolute inset-x-0 bottom-0 w-full text-white/[0.08] transition-transform duration-700 ease-out group-hover:-translate-y-1.5"
        fill="currentColor"
      >
        <circle cx="60" cy="66" r="25" />
        <path d="M10 160c0-33 22-58 50-58s50 25 50 58z" />
      </svg>
      <span className="absolute inset-x-3 bottom-3 flex flex-col font-mono text-[10px] leading-relaxed text-white/45">
        <span>{hint.slice(0, slash)}</span>
        <span>{hint.slice(slash)}</span>
      </span>
    </div>
  );
}

/**
 * Thẻ chân dung. Rê chuột: ảnh phóng nhẹ, nổi bóng và sáng viền; các thẻ còn lại lùi xuống, mờ đi (xem TeamSection).
 * Phóng to và bóng đổ đặt ở lớp ngoài, vì lớp `.reveal-mask` đã dùng transition riêng cho hiệu ứng hé mở.
 */
function MemberCard({ member: m, index }: { member: Member; index: number }) {
  return (
    <article className="group flex h-full flex-col">
      <div className="rounded-2xl transition duration-500 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_30px_60px_-24px_rgb(0_0_0/0.85)]">
        <div className="reveal-mask relative aspect-[3/4] overflow-hidden rounded-2xl bg-forest-2">
          <div className="reveal-zoom absolute inset-0">
            {m.photo.src ? (
              <Image
                src={m.photo.src}
                alt={m.photo.alt}
                fill
                sizes="(min-width: 1024px) 220px, (min-width: 768px) 33vw, 50vw"
                className="object-cover object-[50%_28%]"
              />
            ) : (
              <PortraitPlaceholder hint={m.photo.hint} />
            )}
          </div>
          <div aria-hidden className="absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-black/45 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-forest/60 to-transparent" />
          <span className="absolute left-3.5 top-2.5 font-heading text-[26px] font-extrabold leading-none tracking-tight text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.4)]">
            {pad(index + 1)}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition duration-500 group-hover:ring-white/40"
          />
        </div>
      </div>
      <div className="relative mt-5 h-px bg-white/15">
        <span aria-hidden className="absolute inset-y-0 left-0 w-0 bg-mint transition-[width] duration-700 ease-out group-hover:w-full" />
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-white">{m.name}</h3>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint/85">{m.unit}</p>
    </article>
  );
}

export function TeamSection() {
  return (
    <Section id="nhom-thuc-hien" className="mesh-dark relative overflow-hidden text-white">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        <Reveal>
          <SectionHeading dark title={team.title} />
        </Reveal>
        <ul className="group/team mt-14 flex flex-wrap justify-center gap-x-4 gap-y-12 sm:gap-x-6">
          {team.members.map((m, i) => (
            <li
              key={m.photo.hint}
              className={cn(
                "w-[calc(50%-8px)] sm:w-[calc(50%-12px)] md:w-[calc((100%-48px)/3)] lg:w-[calc((100%-96px)/5)]",
                // Rê chuột lên một thẻ thì các thẻ còn lại lùi xuống, mờ đi. Chỉ áp dụng khi có chuột, để chạm trên điện thoại không làm mờ cả hàng.
                "transition duration-500 ease-out [@media(hover:hover)]:group-has-[article:hover]/team:not-has-[article:hover]:scale-95 [@media(hover:hover)]:group-has-[article:hover]/team:not-has-[article:hover]:opacity-40",
              )}
            >
              <Reveal delay={i * 110} className="h-full">
                <MemberCard member={m} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
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
          <Accordion className="rounded-xl border bg-card px-6">
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
