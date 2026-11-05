/** Phần thuần của tìm kiếm: chuẩn hóa câu hỏi, biểu thức từ khóa, gộp thứ hạng. Bản sao của services/rag/app/retrieval. */

export function normalizeQuery(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * Biểu thức tsquery cho tìm từ khóa. Cấu hình 'simple' của PostgreSQL tách từ tiếng Việt theo âm tiết, nên ghép
 * từng cặp âm tiết liền nhau bằng <-> để giữ trật tự từ, rồi nối các cặp bằng OR cho câu hỏi dài khớp một phần.
 * Chỉ giữ chữ, số, gạch dưới nên không có toán tử tsquery nào lọt vào.
 */
export function lexicalQuery(query: string): string | null {
  const tokens = (query.match(/[\p{L}\p{M}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase());
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return tokens[0];
  const pairs = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) pairs.add(`${tokens[i]} <-> ${tokens[i + 1]}`);
  return [...pairs].join(" | ");
}

/** Reciprocal Rank Fusion: mỗi đoạn nhận tổng 1 / (k + hạng) trên các danh sách. */
export function rrf<T extends { id: string }>(rankings: T[][], k = 60): (T & { rrf_score: number })[] {
  const merged = new Map<string, T & { rrf_score: number }>();
  for (const ranking of rankings) {
    ranking.forEach((row, i) => {
      const item = merged.get(row.id) ?? { ...row, rrf_score: 0 };
      for (const [key, value] of Object.entries(row)) if (!(key in item)) (item as Record<string, unknown>)[key] = value;
      item.rrf_score += 1 / (k + i + 1);
      merged.set(row.id, item);
    });
  }
  return [...merged.values()].sort((a, b) => b.rrf_score - a.rrf_score);
}
