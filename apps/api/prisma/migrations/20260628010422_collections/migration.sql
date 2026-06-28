-- CreateTable
CREATE TABLE "CollectionMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "channel" "CollectionChannel" NOT NULL DEFAULT 'WHATSAPP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "installmentId" TEXT,
    "channel" "CollectionChannel" NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "link" TEXT,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionMessage_companyId_idx" ON "CollectionMessage"("companyId");

-- CreateIndex
CREATE INDEX "CollectionHistory_companyId_idx" ON "CollectionHistory"("companyId");

-- CreateIndex
CREATE INDEX "CollectionHistory_customerId_idx" ON "CollectionHistory"("customerId");

-- CreateIndex
CREATE INDEX "CollectionHistory_companyId_createdAt_idx" ON "CollectionHistory"("companyId", "createdAt");
