-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "SchemaMetadata" ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "businessPurpose" TEXT,
ADD COLUMN     "columnDescriptions" JSONB,
ADD COLUMN     "embeddingVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "isStale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadataVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "synonyms" TEXT[];

-- CreateTable
CREATE TABLE "SchemaEmbedding" (
    "id" TEXT NOT NULL,
    "metadataId" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemaEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tableName" TEXT,
    "progress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchemaEmbedding_metadataId_idx" ON "SchemaEmbedding"("metadataId");

-- CreateIndex
CREATE INDEX "BackgroundJob_connectionId_idx" ON "BackgroundJob"("connectionId");

-- AddForeignKey
ALTER TABLE "SchemaEmbedding" ADD CONSTRAINT "SchemaEmbedding_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "SchemaMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
