/** Sổ ghi chép của học viên: kiểu dữ liệu, lựa chọn tùy chỉnh và giới hạn. Dùng được ở cả client và server. */

export const NOTEBOOK_TITLE_MAX = 80;
export const NOTEBOOK_DESC_MAX = 240;
export const PAGE_TITLE_MAX = 120;
/** Khoảng 25 trang giấy A4 chữ thường. */
export const PAGE_BODY_MAX = 60_000;
export const NOTEBOOKS_MAX = 40;
export const PAGES_PER_NOTEBOOK = 400;
/** Lời bàn thêm khi chép một đoạn giáo trình vào sổ. */
export const CLIP_NOTE_MAX = 2000;

/** Màu bìa. `cover` là nền bìa (luôn chữ trắng), `soft` là nền nhạt của dải màu trong danh sách. */
export const NOTEBOOK_COLORS = {
  "xanh-la": { label: "Xanh lá", cover: "#15803d", soft: "rgb(21 128 61 / 0.12)" },
  "xanh-reu": { label: "Xanh rêu", cover: "#3f6212", soft: "rgb(63 98 18 / 0.12)" },
  "xanh-ngoc": { label: "Xanh ngọc", cover: "#0f766e", soft: "rgb(15 118 110 / 0.12)" },
  "xanh-duong": { label: "Xanh dương", cover: "#1d4ed8", soft: "rgb(29 78 216 / 0.12)" },
  "tim": { label: "Tím", cover: "#6d28d9", soft: "rgb(109 40 217 / 0.12)" },
  "do": { label: "Đỏ", cover: "#b91c1c", soft: "rgb(185 28 28 / 0.12)" },
  "cam": { label: "Cam", cover: "#c2410c", soft: "rgb(194 65 12 / 0.12)" },
  "nau": { label: "Nâu", cover: "#78350f", soft: "rgb(120 53 15 / 0.12)" },
  "xam": { label: "Xám than", cover: "#334155", soft: "rgb(51 65 85 / 0.12)" },
} as const;
export type NotebookColor = keyof typeof NOTEBOOK_COLORS;
export const COLOR_IDS = Object.keys(NOTEBOOK_COLORS) as [NotebookColor, ...NotebookColor[]];

/** Biểu tượng trên bìa. Ánh xạ sang lucide ở components/NotebookIcon.tsx. */
export const NOTEBOOK_ICONS = {
  "so": "Sổ",
  "sach": "Sách",
  "but": "Bút",
  "bong-den": "Ý tưởng",
  "co": "Cờ",
  "can": "Cân",
  "bieu-do": "Biểu đồ",
  "dia-cau": "Địa cầu",
  "khien": "Khiên",
  "ngoi-sao": "Ngôi sao",
  "lich": "Lịch",
  "muc-tieu": "Mục tiêu",
} as const;
export type NotebookIconId = keyof typeof NOTEBOOK_ICONS;
export const ICON_IDS = Object.keys(NOTEBOOK_ICONS) as [NotebookIconId, ...NotebookIconId[]];

/** Kiểu giấy của trang viết, vẽ bằng CSS (lớp .giay-*). */
export const PAPER_STYLES = {
  "ke-ngang": { label: "Kẻ ngang", hint: "Như vở học sinh" },
  "o-vuong": { label: "Ô vuông", hint: "Hợp với sơ đồ, công thức" },
  "cham": { label: "Chấm bi", hint: "Nhẹ mắt, dễ căn lề" },
  "tron": { label: "Giấy trơn", hint: "Không kẻ dòng" },
} as const;
export type PaperStyle = keyof typeof PAPER_STYLES;
export const PAPER_IDS = Object.keys(PAPER_STYLES) as [PaperStyle, ...PaperStyle[]];

/** Cỡ chữ trang viết. */
export const FONT_SIZES = {
  nho: { label: "Nhỏ", px: 14 },
  vua: { label: "Vừa", px: 16 },
  lon: { label: "Lớn", px: 18 },
} as const;
export type FontSize = keyof typeof FONT_SIZES;
export const FONT_IDS = Object.keys(FONT_SIZES) as [FontSize, ...FontSize[]];

/** Thứ tự trang trong sổ. */
export const PAGE_ORDERS = {
  "moi-sua": "Mới sửa trước",
  "moi-tao": "Mới tạo trước",
  "cu-truoc": "Cũ trước (như vở)",
  "ten": "Theo tên trang",
} as const;
export type PageOrder = keyof typeof PAGE_ORDERS;
export const ORDER_IDS = Object.keys(PAGE_ORDERS) as [PageOrder, ...PageOrder[]];

/** Phần tùy chỉnh của sổ: tên, bìa, giấy, môn. */
export interface NotebookSettings {
  title: string;
  description: string;
  color: NotebookColor;
  icon: NotebookIconId;
  paper: PaperStyle;
  fontSize: FontSize;
  pageOrder: PageOrder;
  /** Môn gắn với sổ, để chọn chương cho từng trang. Null là sổ chung. */
  subject: string | null;
}

export interface Notebook extends NotebookSettings {
  id: number;
  pinned: boolean;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Trang trong danh sách bên trái: không kèm toàn văn. */
export interface PageSummary {
  id: number;
  notebookId: number;
  title: string;
  /** Đoạn đầu của nội dung, đã bỏ ký hiệu Markdown. */
  excerpt: string;
  subject: string | null;
  chapter: number | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookPage extends PageSummary {
  body: string;
}

/** Sổ và vài trang gần nhất, cho hộp chọn "Vào sổ" ở trình đọc. */
export interface NotebookPick {
  id: number;
  title: string;
  color: NotebookColor;
  icon: NotebookIconId;
  pages: { id: number; title: string }[];
}

export const DEFAULT_SETTINGS: Omit<NotebookSettings, "title" | "subject"> = {
  description: "",
  color: "xanh-la",
  icon: "so",
  paper: "ke-ngang",
  fontSize: "vua",
  pageOrder: "moi-sua",
};

export const UNTITLED_PAGE = "Trang chưa đặt tên";

export const notebookHref = (id: number, pageId?: number | null) => `/so-ghi-chep/${id}${pageId ? `?trang=${pageId}` : ""}`;

/** Bỏ ký hiệu Markdown, công thức, liên kết để làm đoạn trích ngắn trong danh sách. */
export function plainExcerpt(body: string, max = 160): string {
  const text = body
    .replace(/\$\$[\s\S]*?\$\$/g, " [công thức] ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Ghép trang của một sổ thành một file Markdown để tải về. */
export function notebookToMarkdown(nb: Pick<Notebook, "title" | "description">, pages: Pick<NotebookPage, "title" | "body" | "updatedAt">[]): string {
  const head = [`# ${nb.title}`, nb.description && `_${nb.description}_`].filter(Boolean).join("\n\n");
  const body = pages.map((p) => `## ${p.title || UNTITLED_PAGE}\n\n${p.body.trim()}`).join("\n\n---\n\n");
  return `${head}\n\n${body}\n`;
}
