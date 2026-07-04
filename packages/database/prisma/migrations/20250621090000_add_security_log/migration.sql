-- CreateTable
CREATE TABLE "security_log" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "path" TEXT,
    "userAgent" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_log_eventType_createdAt_idx" ON "security_log"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "security_log_ip_createdAt_idx" ON "security_log"("ip", "createdAt");