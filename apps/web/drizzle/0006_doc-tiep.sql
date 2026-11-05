CREATE TABLE "reading_positions" (
	"visitor_id" text NOT NULL,
	"slug" text NOT NULL,
	"page" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reading_positions_doc_idx" ON "reading_positions" USING btree ("visitor_id","slug");--> statement-breakpoint
CREATE INDEX "reading_positions_recent_idx" ON "reading_positions" USING btree ("visitor_id","updated_at");