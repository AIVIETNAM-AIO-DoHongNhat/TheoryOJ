export type NoteSource = "thu-vien" | "bai-viet";

export const QUOTE_MAX = 1000;
export const NOTE_MAX = 2000;
/** Số ký tự lấy trước và sau đoạn trích để tìm lại đúng chỗ khi đoạn trích lặp lại trong văn bản. */
export const CONTEXT_LEN = 48;
/** Mỗi học viên tối đa bấy nhiêu ghi chú trên một tài liệu. */
export const NOTES_PER_DOC = 500;

/** Ghi chú gửi xuống trình duyệt. */
export interface ReaderNote {
  id: number;
  source: NoteSource;
  slug: string;
  chapter: number | null;
  /** Trang PDF; null với văn bản. */
  pdfPage: number | null;
  quote: string;
  prefix: string;
  suffix: string;
  note: string;
  createdAt: string;
}

/** Vị trí bôi đen gửi lên khi tạo ghi chú. */
export interface NoteAnchor {
  quote: string;
  prefix: string;
  suffix: string;
  pdfPage: number | null;
  chapter: number | null;
}

/** Mở trợ lý với đoạn trích điền sẵn (giới hạn câu hỏi 1.500 ký tự ở /tro-ly). */
export function askAboutHref(subject: string, chapter: number | null, quote: string): string {
  const q = `«${quote.length > 1200 ? `${quote.slice(0, 1200)}…` : quote}»\n\nGiải thích giúp tôi đoạn trích trên.`;
  return `/tro-ly?mon=${subject}&che-do=qa${chapter ? `&chuong=${chapter}` : ""}&q=${encodeURIComponent(q)}`;
}

export function noteHref(n: Pick<ReaderNote, "source" | "slug" | "pdfPage">): string {
  const base = `/${n.source}/${n.slug}`;
  return n.pdfPage ? `${base}?trang=${n.pdfPage}` : base;
}
