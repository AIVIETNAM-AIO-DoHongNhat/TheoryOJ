CREATE TABLE "student_roster" (
	"student_code" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"class_name" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_roster" ADD CONSTRAINT "student_roster_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_roster_class_idx" ON "student_roster" USING btree ("class_name");