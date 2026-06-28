-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultInterest" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "defaultFine" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daysToOverdue" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_companyId_key" ON "SystemSettings"("companyId");
