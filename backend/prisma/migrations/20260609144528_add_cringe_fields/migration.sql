-- AlterTable
ALTER TABLE "readings" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "cringeLevel" INTEGER,
ADD COLUMN     "cringeReason" TEXT,
ADD COLUMN     "recommendedTo" TEXT,
ADD COLUMN     "redFlags" TEXT,
ADD COLUMN     "reflection" TEXT;
