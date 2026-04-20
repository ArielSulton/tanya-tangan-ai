ALTER TABLE "words" ADD COLUMN "adverb_subcategory" text;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "slider_config" jsonb;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "timeline_config" jsonb;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "certainty_config" jsonb;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "gauge_config" jsonb;--> statement-breakpoint
CREATE INDEX "words_adverb_subcategory_idx" ON "words" USING btree ("adverb_subcategory");