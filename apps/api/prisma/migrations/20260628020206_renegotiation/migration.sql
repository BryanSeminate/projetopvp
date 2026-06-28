-- AlterTable
ALTER TABLE "CustomerInstallment" ADD COLUMN     "renegotiationId" TEXT;

-- CreateTable
CREATE TABLE "DebtRenegotiation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalTotal" DECIMAL(14,2) NOT NULL,
    "newTotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "installments" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtRenegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtRenegotiationItem" (
    "id" TEXT NOT NULL,
    "renegotiationId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DebtRenegotiationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtRenegotiation_companyId_idx" ON "DebtRenegotiation"("companyId");

-- CreateIndex
CREATE INDEX "DebtRenegotiation_customerId_idx" ON "DebtRenegotiation"("customerId");

-- CreateIndex
CREATE INDEX "DebtRenegotiationItem_renegotiationId_idx" ON "DebtRenegotiationItem"("renegotiationId");

-- AddForeignKey
ALTER TABLE "CustomerInstallment" ADD CONSTRAINT "CustomerInstallment_renegotiationId_fkey" FOREIGN KEY ("renegotiationId") REFERENCES "DebtRenegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRenegotiation" ADD CONSTRAINT "DebtRenegotiation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRenegotiationItem" ADD CONSTRAINT "DebtRenegotiationItem_renegotiationId_fkey" FOREIGN KEY ("renegotiationId") REFERENCES "DebtRenegotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRenegotiationItem" ADD CONSTRAINT "DebtRenegotiationItem_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "CustomerInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
