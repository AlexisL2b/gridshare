import { prisma } from "../lib/prisma";
import { TransactionType } from "@prisma/client";

interface EnergyActionInput {
  contractId: string;
  userId: string;
  amountKwh: number;
  type: TransactionType;
}

/**
 * Stocker de l'énergie sur un contrat.
 * Augmente usedKwh du contrat, crée une transaction au ledger.
 */
export async function storeEnergy(input: Omit<EnergyActionInput, "type">) {
  return executeEnergyAction({ ...input, type: "STORE" });
}

/**
 * Restituer de l'énergie depuis un contrat.
 * Diminue usedKwh du contrat, crée une transaction au ledger.
 */
export async function restoreEnergy(input: Omit<EnergyActionInput, "type">) {
  return executeEnergyAction({ ...input, type: "RESTORE" });
}

async function executeEnergyAction(input: EnergyActionInput) {
  const contract = await prisma.storageContract.findUnique({
    where: { id: input.contractId },
    include: { offer: true },
  });

  if (!contract) {
    throw new Error("Contrat introuvable");
  }

  if (contract.status !== "ACTIVE") {
    throw new Error("Ce contrat n'est plus actif");
  }

  if (contract.clientId !== input.userId) {
    throw new Error("Ce contrat ne vous appartient pas");
  }

  if (input.amountKwh <= 0) {
    throw new Error("La quantité doit être positive");
  }

  if (input.type === "STORE") {
    const spaceLeft = contract.allocatedKwh - contract.usedKwh;
    if (input.amountKwh > spaceLeft) {
      throw new Error(
        `Espace insuffisant (${spaceLeft.toFixed(2)} kWh disponibles)`
      );
    }
  }

  if (input.type === "RESTORE") {
    if (input.amountKwh > contract.usedKwh) {
      throw new Error(
        `Énergie stockée insuffisante (${contract.usedKwh.toFixed(2)} kWh stockés)`
      );
    }
  }

  const totalCost = input.amountKwh * contract.pricePerKwh;

  const usedKwhDelta =
    input.type === "STORE" ? input.amountKwh : -input.amountKwh;

  const [transaction] = await prisma.$transaction([
    prisma.energyTransaction.create({
      data: {
        contractId: input.contractId,
        type: input.type,
        amountKwh: input.amountKwh,
        pricePerKwh: contract.pricePerKwh,
        totalCost,
      },
    }),
    prisma.storageContract.update({
      where: { id: input.contractId },
      data: {
        usedKwh: { increment: usedKwhDelta },
      },
    }),
  ]);

  return transaction;
}

/** Historique des transactions pour un contrat */
export async function getContractTransactions(
  contractId: string,
  userId: string
) {
  const contract = await prisma.storageContract.findUnique({
    where: { id: contractId },
    include: { offer: true },
  });

  if (!contract) {
    throw new Error("Contrat introuvable");
  }

  const isOwner =
    contract.clientId === userId || contract.offer.hostId === userId;

  if (!isOwner) {
    throw new Error("Accès non autorisé à ce contrat");
  }

  return prisma.energyTransaction.findMany({
    where: { contractId },
    orderBy: { createdAt: "desc" },
  });
}

/** Historique complet des transactions d'un utilisateur */
export async function getUserTransactions(userId: string, userType: string) {
  if (userType === "HOST") {
    return prisma.energyTransaction.findMany({
      where: { contract: { offer: { hostId: userId } } },
      include: {
        contract: {
          select: {
            id: true,
            clientId: true,
            allocatedKwh: true,
            offer: { select: { id: true, battery: { select: { label: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.energyTransaction.findMany({
    where: { contract: { clientId: userId } },
    include: {
      contract: {
        select: {
          id: true,
          allocatedKwh: true,
          offer: {
            select: {
              id: true,
              host: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
