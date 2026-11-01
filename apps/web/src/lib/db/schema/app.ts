import {
  boolean, index, integer, jsonb, pgTable, real, smallint, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

// Bảng của ứng dụng (PLAN.md mục 7). Bảng documents, chunks do services/rag sở hữu.
// Mọi dữ liệu học tập gắn với mã khách (`visitor_id`, lib/visitor.ts). Người chưa đăng nhập dùng mã ngẫu nhiên trong cookie;
// tài khoản có mã khách riêng (`users.visitor_id`), khi đăng nhập dữ liệu của trình duyệt được gộp vào mã đó.

/** Tài khoản học viên tự đăng ký (lib/auth). Chưa có vai trò giảng viên. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  /** Mã học viên, viết hoa, dùng để đăng nhập. */
  studentCode: text("student_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  className: text("class_name").notNull(),
  /** scrypt, định dạng ở lib/auth/password.ts. */
  passwordHash: text("password_hash").notNull(),
  /** Mã khách của tài khoản: tiến độ, hội thoại, khảo sát lưu theo mã này. */
  visitorId: text("visitor_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/** Phiên đăng nhập. Chỉ lưu SHA-256 của mã phiên, mã gốc nằm trong cookie httpOnly. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

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

/** Khảo sát thang 5 điểm trước và sau đợt thử nghiệm (PLAN.md mục 10). Mỗi trình duyệt một phiếu cho mỗi đợt, gửi lại thì ghi đè. */
export const surveyResponses = pgTable("survey_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitorId: text("visitor_id").notNull(),
  /** "truoc" hoặc "sau" đợt thử nghiệm. */
  phase: text("phase", { enum: ["truoc", "sau"] }).notNull(),
  role: text("role", { enum: ["hoc-vien", "giang-vien"] }).notNull(),
  /** { mã câu: điểm 1–5 }, mã câu ở features/survey/questions.ts. */
  answers: jsonb("answers").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("survey_visitor_phase_idx").on(t.visitorId, t.phase)]);
