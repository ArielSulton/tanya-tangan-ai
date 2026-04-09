CREATE TABLE "word_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word_id" uuid NOT NULL,
	"low_image_url" text NOT NULL,
	"high_image_url" text NOT NULL,
	"low_label" text NOT NULL,
	"high_label" text NOT NULL,
	"reference_word" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_comparisons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "word_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gesture_input" text NOT NULL,
	"suggested_word" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"level" text DEFAULT 'sdlb' NOT NULL,
	"image_url" text,
	"image_source" text DEFAULT 'api' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "words" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "word_comparisons" ADD CONSTRAINT "word_comparisons_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "word_comparisons_word_id_idx" ON "word_comparisons" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "word_requests_session_id_idx" ON "word_requests" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "word_requests_created_at_idx" ON "word_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "words_category_idx" ON "words" USING btree ("category");--> statement-breakpoint
CREATE INDEX "words_type_idx" ON "words" USING btree ("type");--> statement-breakpoint
CREATE INDEX "words_level_idx" ON "words" USING btree ("level");