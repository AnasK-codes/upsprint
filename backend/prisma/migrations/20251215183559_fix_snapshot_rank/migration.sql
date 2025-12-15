/*
  Warnings:

  - You are about to drop the column `rank` on the `PlatformSnapshot` table. All the data in the column will be lost.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `batch` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branch` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "LinkedAccount_platform_username_key";

-- AlterTable
ALTER TABLE "PlatformSnapshot" DROP COLUMN "rank",
ADD COLUMN     "rankTitle" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "batch" SET NOT NULL,
ALTER COLUMN "branch" SET NOT NULL;
