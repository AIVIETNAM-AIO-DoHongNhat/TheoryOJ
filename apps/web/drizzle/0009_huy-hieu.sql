CREATE TABLE "user_badges" (
	"visitor_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_badge_idx" ON "user_badges" USING btree ("visitor_id","badge_id");