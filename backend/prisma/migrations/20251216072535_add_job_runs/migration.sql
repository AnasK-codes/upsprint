-- CreateTable
CREATE TABLE "JobRun" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);
