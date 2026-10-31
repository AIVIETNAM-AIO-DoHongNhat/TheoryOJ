import {
  boolean, index, integer, jsonb, pgTable, real, smallint, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

// Bảng của ứng dụng (PLAN.md mục 7). Bảng documents, chunks do services/rag sở hữu.
// Không có tài khoản: hội thoại và đánh giá gắn với mã khách ẩn danh lưu trong cookie (lib/visitor.ts).

export const conversations = pgTable("conversations", {
  /** Id do client sinh (useChat), gửi lên trong trường `id` của mỗi yêu cầu. */
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("conversations_visitor_updated_idx").on(t.visitorId, t.updatedAt)]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  /** Phần chữ, dùng khi xem lại nhật ký. */
  content: text("content").notNull(),
  /** Toàn bộ UIMessage.parts để mở lại hội thoại cùng trích dẫn và kết quả công cụ. */
  parts: jsonb("parts").notNull(),
  // Các trường dưới chỉ có ở tin nhắn của trợ lý.
  /** Câu hỏi của lượt này, để câu hỏi và câu trả lời nằm trên một dòng khi xem lại. */
  question: text("question"),
  mode: text("mode"),
  chapters: integer("chapters").array(),
  label: text("label"),
  /** Lý do từ chối (`RefusalReason`), null nếu đã trả lời. */
  refused: text("refused"),
  /** Câu khiêu khích hoặc chèn lệnh, cần giảng viên xem. */
  flagged: boolean("flagged").notNull().default(false),
  rewrittenQuery: text("rewritten_query"),
  maxScore: real("max_score"),
  citations: jsonb("citations"),
  latencyMs: integer("latency_ms"),
  timings: jsonb("timings"),
  /** Bị lỗi hoặc người hỏi bấm dừng giữa chừng. */
  incomplete: boolean("incomplete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("messages_conversation_idx").on(t.conversationId, t.createdAt),
  index("messages_log_idx").on(t.role, t.createdAt),
]);

export const feedback = pgTable("feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  /** 1 là 👍, -1 là 👎. */
  rating: smallint("rating").notNull(),
  reason: text("reason"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("feedback_message_visitor_idx").on(t.messageId, t.visitorId)]);

/** Một lượt làm trắc nghiệm hoặc bài tập tính toán, gắn với mã khách. Bảng tiến độ đọc từ đây. */
export const practiceAttempts = pgTable("practice_attempts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  subject: text("subject").notNull(),
  chapter: integer("chapter").notNull(),
  kind: text("kind", { enum: ["quiz", "exercise"] }).notNull(),
  /** Số câu (trắc nghiệm) hoặc số đại lượng (bài tập) làm đúng. */
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  /** Trắc nghiệm: [{ id, chosen, correct }]. Bài tập: { template, given, answers, expected }. */
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("practice_attempts_visitor_idx").on(t.visitorId, t.subject, t.createdAt)]);

/** Đếm theo cửa sổ cố định cho /api/chat, theo mã khách và theo IP. */
export const chatRateLimits = pgTable("chat_rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
