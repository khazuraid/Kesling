CREATE TABLE IF NOT EXISTS "app_setting" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
