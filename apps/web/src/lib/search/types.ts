import { z } from "zod";

// Khớp với services/rag/app/schemas.py.
export const KINDS = ["giao_trinh", "van_kien", "tham_khao", "cand", "so_lieu"] as const;
export type Kind = (typeof KINDS)[number];

export const hitSchema = z.object({
  text: z.string(),
  document: z.string(),
  document_title: z.string(),
  kind: z.string(),
  chapter: z.number().nullable(),
  page: z.number().nullable(),
  pdf_page: z.number().nullable(),
  section: z.string().nullable(),
  score: z.number(),
  vector_score: z.number().nullish(),
});

export const responseSchema = z.object({
  hits: z.array(hitSchema),
  max_score: z.number(),
  mode: z.string(),
});

export type Hit = z.infer<typeof hitSchema>;
export type SearchResponse = z.infer<typeof responseSchema>;

export interface SearchRequest {
  query: string;
  subject: string;
  chapters?: number[];
  kinds?: Kind[];
  top_k?: number;
}

export class RagError extends Error {}
