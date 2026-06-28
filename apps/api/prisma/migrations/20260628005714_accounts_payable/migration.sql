-- CreateTable
CREATE TABLE "AccountPayable" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fine" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "PayableStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountPayable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountPayable_companyId_idx" ON "AccountPayable"("companyId");

-- CreateIndex
CREATE INDEX "AccountPayable_companyId_status_idx" ON "AccountPayable"("companyId", "status");

-- CreateIndex
CREATE INDEX "AccountPayable_companyId_dueDate_idx" ON "AccountPayable"("companyId", "dueDate");
