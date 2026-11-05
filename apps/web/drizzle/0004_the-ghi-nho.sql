CREATE TABLE "flashcard_states" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "flashcard_states_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"visitor_id" text NOT NULL,
	"subject" text NOT NULL,
	"chapter" integer NOT NULL,
	"card_id" text NOT NULL,
	"ease" real NOT NULL,
	"interval_days" real NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"reviews" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_states_card_idx" ON "flashcard_states" USING btree ("visitor_id","subject","card_id");