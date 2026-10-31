CREATE TABLE "practice_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "practice_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"kind" text NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "practice_attempts_visitor_idx" ON "practice_attempts" USING btree ("visitor_id","subject","created_at");