import type { VideoEmbed } from "./embed";

export type VideoOrientation = "ngang" | "doc";

export interface Video {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  /** Người giảng hoặc trang đăng video gốc. */
  author: string | null;
  /** Bài giảng | Minh họa | Tư liệu | Hướng dẫn */
  category: string;
  subject: string;
  chapters: number[];
  /** Thời lượng hiển thị, ví dụ "12:30". Facebook không trả thời lượng nên người nhập tự ghi. */
  duration: string | null;
  orientation: VideoOrientation;
  cover: string | null;
  embed: VideoEmbed;
}
