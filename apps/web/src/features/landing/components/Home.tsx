import {
  ArrowRight, ArrowUp, ArrowUpRight, BookOpen, FileText, Library, MessageSquareText, Newspaper, Search, Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AcademyLogo, SectionHeading } from "@/components/brand";
import { PhotoSlot } from "@/components/brand/PhotoSlot";
import { Reveal } from "@/components/brand/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/config/subjects";
import { PostCard } from "@/features/blog/components/PostCard";
import type { Post } from "@/features/blog/types";
import { MODE_ICONS } from "@/features/chat/mode-icons";
import { MODE_IDS, MODES } from "@/features/chat/modes";
import type { Suggestion } from "@/features/learning/types";
import { DOC_KINDS, KIND_LABELS, type LibraryDoc } from "@/features/library/types";
import { cn } from "@/lib/utils";

import { assistantDemo, cta, facultySection, features, hero, latestPosts, photos, quickLinks } from "../content";

const wrap = "mx-auto max-w-6xl px-4";

/* ------------------------------ Hero ------------------------------ */

/** Hiện dần lần lượt khi tải trang: mỗi khối chậm hơn khối trước một nhịp. */
const rise = "animate-rise";

/**
 * Hero nền xanh đậm, ô hỏi trợ lý đặt ngay đầu trang. Ô hỏi là form GET tới /tro-ly nên chạy được cả khi chưa tải JavaScript.
 * Chuyển động chỉ bằng CSS: chữ hiện dần, ảnh hé mở, thẻ hỏi đáp mẫu bật lên rồi trôi nhẹ, vệt sáng nền dạt chậm.
 * Người dùng bật giảm chuyển động thì mọi thứ đứng yên ở trạng thái cuối (globals.css).
 */
export function HomeHero({ facts, suggestions }: { facts: { value: string; label: string }[]; suggestions: Suggestion[] }) {
  const { demo } = hero;
  return (
    <section className="mesh-dark relative isolate overflow-hidden text-white">
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />
      {/* Hai vệt sáng dạt chậm, làm nền sống động mà không kéo mắt khỏi nội dung. */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 -z-10 size-[520px] rounded-full bg-primary-bright/25 blur-[120px] motion-safe:animate-drift" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 -z-10 size-[460px] rounded-full bg-lime-300/10 blur-[120px] motion-safe:animate-drift motion-safe:[animation-direction:alternate-reverse]" />

      <div className={cn(wrap, "relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24")}>
        <div className="flex flex-col items-start">
          <Badge variant="glass-dark" className={cn(rise, "h-7 gap-2 px-3 text-xs font-medium")}>
            <AcademyLogo className="size-4 drop-shadow-none" />
            {hero.overline}
          </Badge>
          {/* Hai vế mỗi vế một dòng để không ngắt giữa cụm "chính trị". */}
          <h1 className={cn(rise, "anim-delay-80 mt-6 text-[34px] font-extrabold leading-[1.08] tracking-tight min-[400px]:text-[38px] sm:text-[56px] lg:text-[60px]")}>
            <span className="block sm:whitespace-nowrap">{hero.titleStart}</span>
            <span className="text-gradient block text-balance motion-safe:animate-gradient-pan">{hero.titleAccent}</span>
          </h1>
          <p className={cn(rise, "anim-delay-160 mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/70 sm:text-lg")}>{hero.lead}</p>

          <form
            action="/tro-ly"
            className={cn(
              rise,
              "anim-delay-240 group/ask mt-9 flex w-full max-w-xl items-center gap-2 rounded-2xl bg-card p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]",
              "ring-4 ring-white/0 transition-shadow focus-within:ring-white/15",
            )}
          >
            <Search className="ml-2 size-5 shrink-0 text-muted-foreground transition-colors group-focus-within/ask:text-primary" aria-hidden />
            <input
              name="q"
              required
              maxLength={1500}
              placeholder={hero.askPlaceholder}
              aria-label="Câu hỏi cho trợ lý"
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" className="h-11 rounded-xl px-4">
              <span className="hidden sm:inline">{hero.askButton}</span>
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>

          <div className={cn(rise, "anim-delay-320 mt-4 flex max-w-xl flex-wrap items-center gap-2")}>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">{hero.suggestLabel}</span>
            {suggestions.slice(0, 2).map((s) => (
              <Link
                key={s.text}
                href={`/tro-ly?che-do=${s.mode}&q=${encodeURIComponent(s.text)}`}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                {s.text}
              </Link>
            ))}
          </div>

          <div className={cn(rise, "anim-delay-400 mt-9 flex flex-wrap items-center gap-x-6 gap-y-3")}>
            {hero.links.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "group flex items-center gap-1.5 text-sm font-semibold transition-colors",
                  i === 0 ? "rounded-full bg-mint px-4 py-2 text-forest hover:bg-white" : "text-mint hover:text-white",
                )}
              >
                {l.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <Reveal delay={120}>
            <div className="reveal-mask relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-white/15">
              <div className="reveal-zoom absolute inset-0">
                <PhotoSlot photo={photos.hero} priority sizes="460px" className="h-full rounded-none" />
              </div>
              {/* Tối dần ở chân ảnh để thẻ hỏi đáp nổi rõ. */}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-forest/80 to-transparent" />
            </div>
          </Reveal>

          {/* Hỏi đáp mẫu: câu hỏi bật lên trước, câu trả lời có trích dẫn bật sau, rồi cả hai trôi nhẹ lệch nhịp. Bấm câu hỏi để hỏi thật. */}
          <Link
            href={`/tro-ly?q=${encodeURIComponent(demo.question)}`}
            aria-label={`Hỏi trợ lý: ${demo.question}`}
            className="absolute top-10 -left-10 animate-pop-in anim-delay-700"
          >
            <span className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)] transition-colors hover:text-primary motion-safe:animate-float">
              {demo.question}
            </span>
          </Link>

          <div className="absolute -bottom-8 -left-14 w-[320px] animate-pop-in anim-delay-1100" aria-hidden>
            <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-foreground shadow-[0_24px_48px_-16px_rgb(0_0_0/0.55)] motion-safe:animate-float motion-safe:[animation-delay:-3.5s]">
              <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" />
                </span>
                Trợ lý học tập
              </span>
              <p className="text-[13px] leading-relaxed text-foreground/85">{demo.answer}</p>
              <span className="flex items-center gap-2 self-start rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-primary/50 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <BookOpen className="size-3.5" />
                {demo.source} · tr. {demo.page}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(rise, "anim-delay-500 relative border-t border-white/10 bg-black/10")}>
        <dl className={cn(wrap, "grid grid-cols-2 sm:grid-cols-4")}>
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={cn("flex flex-col gap-1 py-6 pr-4", i % 2 === 1 && "border-l border-white/10 pl-6", i > 1 && "border-t border-white/10 sm:border-t-0", i === 2 && "sm:border-l sm:pl-6")}
            >
              <dt className="order-2 text-sm text-white/60">{f.label}</dt>
              <dd className="font-heading text-3xl font-extrabold">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------ Lối vào dạng bento ------------------------------ */

function BentoArrow() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
      <ArrowUpRight className="size-4" />
    </span>
  );
}

const bento = "group relative flex flex-col gap-4 overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgb(5_46_22/0.35)] sm:p-7";

export function BentoSection({ library, postCount }: { library: LibraryDoc[]; postCount: number }) {
  const [subjects, libraryLink, posts, assistant] = quickLinks;
  const kinds = DOC_KINDS.filter((k) => library.some((d) => d.kind === k));
  return (
    <section className="py-16 sm:py-24">
      <div className={cn(wrap, "grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto]")}>
        <Reveal className="lg:row-span-2">
          <Link href={subjects.href} className={cn(bento, "h-full bg-primary-soft")}>
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <BookOpen className="size-6" strokeWidth={1.75} />
              </span>
              <BentoArrow />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold">{subjects.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{subjects.text}</p>
            </div>
            <ul className="mt-auto flex flex-col divide-y rounded-2xl border bg-card">
              {SUBJECTS.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className={cn("font-medium", !s.active && "text-muted-foreground")}>{s.name}</span>
                  {s.active ? (
                    <span className="shrink-0 text-xs font-semibold text-primary">{s.chapters.length} chương</span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Sắp có</span>
                  )}
                </li>
              ))}
            </ul>
          </Link>
        </Reveal>

        <Reveal delay={60}>
          <Link href={libraryLink.href} className={cn(bento, "h-full bg-card")}>
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl border text-primary">
                <Library className="size-6" strokeWidth={1.75} />
              </span>
              <BentoArrow />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{libraryLink.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{libraryLink.text}</p>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-heading text-3xl font-extrabold text-primary">{library.length}</span>
              {kinds.map((k) => (
                <Badge key={k} variant="outline">{KIND_LABELS[k]}</Badge>
              ))}
            </div>
          </Link>
        </Reveal>

        <Reveal delay={120}>
          <Link href={posts.href} className={cn(bento, "h-full bg-card")}>
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl border text-primary">
                <Newspaper className="size-6" strokeWidth={1.75} />
              </span>
              <BentoArrow />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{posts.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{posts.text}</p>
            </div>
            <p className="mt-auto text-sm text-muted-foreground">
              <span className="mr-1.5 font-heading text-3xl font-extrabold text-primary">{postCount}</span>
              bài đã đăng
            </p>
          </Link>
        </Reveal>

        <Reveal delay={180} className="md:col-span-2">
          <Link href={assistant.href} className={cn(bento, "mesh-dark h-full border-transparent text-white sm:flex-row sm:items-end sm:justify-between")}>
            <div className="flex flex-col gap-4">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-mint ring-1 ring-white/15">
                <Sparkles className="size-6" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold">{assistant.title}</h2>
                <p className="max-w-md text-sm leading-relaxed text-white/70">{assistant.text}</p>
              </div>
            </div>
            <span className="flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest transition-transform group-hover:translate-x-0.5 sm:self-auto">
              Bắt đầu hỏi
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Giới thiệu trợ lý ------------------------------ */

/** Khung chat minh họa, dựng bằng HTML để luôn khớp với giao diện thật. */
function DemoChat() {
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-4 rounded-[36px] bg-primary-bright/15 blur-2xl" />
      <div className="relative flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-[0_30px_60px_-30px_rgb(5_46_22/0.4)] sm:p-7">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary-tint px-4 py-2.5 text-sm">{assistantDemo.question}</p>
        </div>
        <div className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card">
            <AcademyLogo className="size-6 drop-shadow-none" />
          </span>
          <div className="flex min-w-0 flex-col gap-3 text-sm leading-relaxed">
            <p>
              {assistantDemo.answer}
              <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-primary">1 · tr. 59</span>
            </p>
            <p className="rounded-xl bg-subtle px-3 py-2 text-center font-mono text-[13px]">{assistantDemo.formula}</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5 text-primary" />
              {assistantDemo.source}
              <span className="font-medium text-primary">· Mở trong thư viện</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">KTCT</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">Hỏi đáp lý thuyết</span>
          <span className="flex-1" />
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowUp className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function AssistantShowcase() {
  return (
    <section className="border-y bg-subtle py-16 sm:py-24">
      <div className={cn(wrap, "grid items-center gap-14 lg:grid-cols-2 lg:gap-20")}>
        <Reveal className="flex flex-col gap-8">
          <SectionHeading overline={features.overline} title={features.title} lead={features.lead} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {MODE_IDS.map((id) => {
              const Icon = MODE_ICONS[id];
              return (
                <li key={id} className="flex gap-3 rounded-2xl border bg-card p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{MODES[id].label}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">{MODES[id].description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <Button size="lg" render={<Link href="/tro-ly" />} nativeButton={false} className="h-11 self-start px-5">
            <MessageSquareText data-icon="inline-start" />
            Mở trợ lý học tập
          </Button>
        </Reveal>
        <Reveal delay={120}>
          <DemoChat />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Bài viết mới ------------------------------ */

export function LatestPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <div className={wrap}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionHeading overline={latestPosts.overline} title={latestPosts.title} />
          </Reveal>
          <Button variant="outline" render={<Link href="/bai-viet" />} nativeButton={false} className="self-start md:self-auto">
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
      </div>
    </section>
  );
}

/* ------------------------------ Ảnh của Khoa ------------------------------ */

export function FacultyGallery() {
  const [first, ...rest] = photos.gallery;
  return (
    <section className="border-t py-16 sm:py-24">
      <div className={wrap}>
        <Reveal>
          <SectionHeading overline={facultySection.overline} title={facultySection.title} lead={facultySection.lead} />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Reveal className="md:col-span-2 md:row-span-2">
            <PhotoSlot photo={first} sizes="(min-width: 768px) 760px, 100vw" className="aspect-[4/3] h-full rounded-3xl md:aspect-auto md:min-h-[440px]" />
          </Reveal>
          {rest.map((p, i) => (
            <Reveal key={p.hint} delay={(i + 1) * 80}>
              <PhotoSlot photo={p} sizes="(min-width: 768px) 380px, 100vw" className="aspect-[4/3] h-full rounded-3xl md:aspect-auto md:min-h-[212px]" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Kêu gọi ------------------------------ */

export function CtaPanel() {
  return (
    <section className={cn(wrap, "pb-16 sm:pb-24")}>
      <Reveal>
        <div className="mesh-dark relative overflow-hidden rounded-[32px] px-6 py-14 text-white sm:px-14 sm:py-20">
          <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{cta.title}</h2>
              <p className="text-lg text-white/70">{cta.text}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="light" size="lg" render={<Link href={cta.primary.href} />} nativeButton={false} className="h-12 rounded-xl px-6">
                {cta.primary.label}
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="glass-dark" size="lg" render={<Link href="/thu-vien" />} nativeButton={false} className="h-12 rounded-xl px-6">
                Vào thư viện
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
