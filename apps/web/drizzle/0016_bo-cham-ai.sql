ALTER TABLE "open_answer_attempts" DROP CONSTRAINT "open_answer_attempts_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ALTER COLUMN "result" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" ALTER COLUMN "score" DROP NOT NULL;--> statement-breakpoint
-- Bỏ chấm bằng AI: xóa lượt hỏi vặn, đưa mọi bài đã được AI chấm về hàng chờ để giảng viên phụ trách môn chấm.
DELETE FROM "open_answer_attempts" WHERE "kind" = 'hoi_vat';--> statement-breakpoint
UPDATE "open_answer_attempts" SET "result" = NULL, "score" = NULL, "flagged" = false;--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "citations";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "model";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "latency_ms";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "pending_follow_up";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "lecturer_score";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "lecturer_note";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "reviewed_by";--> statement-breakpoint
ALTER TABLE "open_answer_attempts" DROP COLUMN "reviewed_at";