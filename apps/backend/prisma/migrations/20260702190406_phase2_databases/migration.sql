-- CreateTable
CREATE TABLE "DatabaseConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "ssl" BOOLEAN NOT NULL DEFAULT true,
    "healthStatus" TEXT NOT NULL DEFAULT 'connecting',
    "schemaVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaMetadata" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "relationships" JSONB NOT NULL,
    "structureHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseConnection_userId_idx" ON "DatabaseConnection"("userId");

-- CreateIndex
CREATE INDEX "SchemaMetadata_connectionId_idx" ON "SchemaMetadata"("connectionId");

-- CreateIndex
CREATE INDEX "SchemaMetadata_structureHash_idx" ON "SchemaMetadata"("structureHash");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseConnection" ADD CONSTRAINT "DatabaseConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemaMetadata" ADD CONSTRAINT "SchemaMetadata_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DatabaseConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
