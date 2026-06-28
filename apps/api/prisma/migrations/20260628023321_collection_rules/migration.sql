-- CreateTable
CREATE TABLE "CollectionRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "endHour" INTEGER NOT NULL DEFAULT 20,
    "messageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionRule_companyId_idx" ON "CollectionRule"("companyId");

-- AddForeignKey
ALTER TABLE "CollectionRule" ADD CONSTRAINT "CollectionRule_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CollectionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
