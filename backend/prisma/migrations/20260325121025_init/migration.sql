-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('HOST', 'CLIENT');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FULL');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('STORE', 'RESTORE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "estimatedProduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batteries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capacityKwh" DOUBLE PRECISION NOT NULL,
    "availableKwh" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batteries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_offers" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "batteryId" TEXT NOT NULL,
    "capacityKwh" DOUBLE PRECISION NOT NULL,
    "remainingKwh" DOUBLE PRECISION NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_contracts" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "allocatedKwh" DOUBLE PRECISION NOT NULL,
    "usedKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_transactions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountKwh" DOUBLE PRECISION NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "batteries" ADD CONSTRAINT "batteries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_offers" ADD CONSTRAINT "storage_offers_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_offers" ADD CONSTRAINT "storage_offers_batteryId_fkey" FOREIGN KEY ("batteryId") REFERENCES "batteries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_contracts" ADD CONSTRAINT "storage_contracts_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "storage_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_contracts" ADD CONSTRAINT "storage_contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_transactions" ADD CONSTRAINT "energy_transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "storage_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
