-- CreateIndex
CREATE INDEX "PlatformSnapshot_linkedAccountId_createdAt_idx" ON "PlatformSnapshot"("linkedAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformSnapshot_createdAt_idx" ON "PlatformSnapshot"("createdAt");
