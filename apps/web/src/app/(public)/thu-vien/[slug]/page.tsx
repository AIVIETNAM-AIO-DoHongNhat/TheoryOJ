import { Download, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Prose, ProseHtml } from "@/components/markdown/Prose";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSubject } from "@/config/subjects";
import { PdfReaderLoader } from "@/features/library/components/PdfReaderLoader";
import { getDoc, getLibrary } from "@/features/library/server/catalog";
import { readMarkdownDoc, renderDocx } from "@/features/library/server/render";
import { docMeta, KIND_LABELS, type LibraryDoc } from "@/features/library/types";

export function generateStaticParams() {
  return getLibrary().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/thu-vien/[slug]">): Promise<Metadata> {
  const doc = getDoc((await params).slug);
  return doc ? { title: doc.title, description: `${KIND_LABELS[doc.kind]} · ${docMeta(doc)}` } : {};
}

function askHref(doc: LibraryDoc): string {
  const mode = doc.kind === "giao_trinh" ? "qa" : "practice";
  return `/tro-ly?mon=${doc.subject}&che-do=${mode}${doc.relatedChapters.length ? `&chuong=${doc.relatedChapters.join(",")}` : ""}`;
}

function Actions({ doc }: { doc: LibraryDoc }) {
  return (
    <>
      <Button variant="outline" render={<a href={`/api/tai-lieu/${doc.slug}?tai=1`} />} nativeButton={false} className="bg-white">
        <Download data-icon="inline-start" />
        Tải về
      </Button>
      <Button render={<Link href={askHref(doc)} />} nativeButton={false}>
        <MessageSquareText data-icon="inline-start" />
        Hỏi trợ lý
      </Button>
    </>
  );
}

async function DocumentPageContent({ params }: PageProps<"/thu-vien/[slug]">) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();

  const header = (
    <PageHeader
      crumbs={[{ label: "Thư viện", href: "/thu-vien" }, { label: doc.title }]}
      title={doc.title}
      actions={<Actions doc={doc} />}
      className="[&_h1]:text-2xl sm:[&_h1]:text-3xl"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge>{KIND_LABELS[doc.kind]}</Badge>
        <Badge variant="outline" render={<Link href={`/mon/${doc.subject}`} />} className="bg-white">
          {getSubject(doc.subject)?.name}
        </Badge>
        <span>{docMeta(doc)}</span>
      </div>
    </PageHeader>
  );

  if (doc.format === "pdf") {
    return (
      <>
        {header}
        <div className="mx-auto flex h-[calc(100dvh-4.5rem)] min-h-[560px] w-full max-w-7xl flex-col px-2 py-3 sm:px-4 sm:py-4">
          <PdfReaderLoader slug={doc.slug} title={doc.title} pages={doc.pages} pageOffset={doc.pageOffset} chapters={doc.chapters} />
        </div>
      </>
    );
  }

  const md = doc.format === "md" ? readMarkdownDoc(doc) : null;
  const html = doc.format === "docx" ? await renderDocx(doc.slug) : "";

  return (
    <>
      {header}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_260px] lg:gap-16">
        <article className="min-w-0 max-w-3xl">{md ? <Prose>{md.body}</Prose> : <ProseHtml html={html} />}</article>
        <aside className="order-first flex flex-col gap-4 lg:order-none">
          <div className="flex flex-col gap-3 rounded-xl border bg-subtle p-5 text-sm lg:sticky lg:top-24">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Thông tin</p>
            <dl className="flex flex-col gap-2.5">
              <div>
                <dt className="text-muted-foreground">Loại</dt>
                <dd className="font-medium">{KIND_LABELS[doc.kind]}</dd>
              </div>
              {md?.meta.map((m) => (
                <div key={m.label}>
                  <dt className="text-muted-foreground">{m.label}</dt>
                  <dd className="font-medium break-all">
                    {m.value.startsWith("http") ? (
                      <a href={m.value} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">
                        {new URL(m.value).hostname}
                      </a>
                    ) : (
                      m.value
                    )}
                  </dd>
                </div>
              ))}
              {doc.relatedChapters.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Liên quan</dt>
                  <dd className="flex flex-wrap gap-1.5 pt-1">
                    {doc.relatedChapters.map((n) => (
                      <Badge key={n} variant="outline" render={<Link href={`/mon/${doc.subject}/chuong/${n}`} />} className="bg-white">
                        Chương {n}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function DocumentPage(props: PageProps<"/thu-vien/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentPageContent {...props} />
    </Suspense>
  );
}
