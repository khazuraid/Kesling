CREATE TABLE IF NOT EXISTS system_error_log (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  "userId" INTEGER,
  "userEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS system_error_log_createdAt_idx ON system_error_log("createdAt");
