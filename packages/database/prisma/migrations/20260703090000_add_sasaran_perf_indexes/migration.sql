CREATE INDEX IF NOT EXISTS "Sasaran_subCategoryId_puskesmasId_idx"
ON "Sasaran"("subCategoryId", "puskesmasId");

CREATE INDEX IF NOT EXISTS "Sasaran_createdAt_idx"
ON "Sasaran"("createdAt");

CREATE INDEX IF NOT EXISTS "Sasaran_dataDinamis_gin_idx"
ON "Sasaran" USING GIN ("dataDinamis");
