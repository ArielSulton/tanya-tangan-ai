ALTER TABLE "word_comparisons" DROP CONSTRAINT "word_comparisons_word_id_words_id_fk";
--> statement-breakpoint
ALTER TABLE "word_comparisons" ADD CONSTRAINT "word_comparisons_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;