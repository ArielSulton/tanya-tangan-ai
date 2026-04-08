ALTER TABLE "institutions" ADD COLUMN "jenjang" varchar(10);--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "mata_pelajaran" varchar(100);--> statement-breakpoint
CREATE INDEX "institutions_jenjang_idx" ON "institutions" USING btree ("jenjang");--> statement-breakpoint
CREATE INDEX "institutions_mata_pelajaran_idx" ON "institutions" USING btree ("mata_pelajaran");