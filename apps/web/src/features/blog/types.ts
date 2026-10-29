export interface Post {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  author: string;
  category: string;
  subject: string;
  chapters: number[];
  cover: string | null;
  readingMinutes: number;
  body: string;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
