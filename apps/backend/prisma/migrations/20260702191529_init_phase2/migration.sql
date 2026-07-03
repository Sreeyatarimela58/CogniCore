/*
  Warnings:

  - The `healthStatus` column on the `DatabaseConnection` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('CONNECTING', 'SYNCING', 'COMPLETED', 'FAILED', 'INVALID_CREDENTIALS');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'UNHEALTHY', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "DatabaseConnection" DROP CONSTRAINT "DatabaseConnection_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- AlterTable
ALTER TABLE "DatabaseConnection" ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'CONNECTING',
DROP COLUMN "healthStatus",
ADD COLUMN     "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN';

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseConnection" ADD CONSTRAINT "DatabaseConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
