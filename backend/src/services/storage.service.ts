import { prisma } from "../lib/prisma";
import { calculateDynamicPrice } from "./pricing.service";

interface CreateOfferInput {
  hostId: string;
  batteryId: string;
  capacityKwh: number;
  pricePerKwh?: number;
}

interface ReserveInput {
  clientId: string;
  offerId: string;
  requestedKwh: number;
}

/** Publier une offre de stockage sur la marketplace */
export async function createOffer(input: CreateOfferInput) {
  const battery = await prisma.battery.findUnique({
    where: { id: input.batteryId },
  });

  if (!battery) {
    throw new Error("Batterie introuvable");
  }

  if (battery.userId !== input.hostId) {
    throw new Error("Cette batterie ne vous appartient pas");
  }

  if (input.capacityKwh <= 0) {
    throw new Error("La capacité doit être positive");
  }

  if (input.capacityKwh > battery.availableKwh) {
    throw new Error(
      `Capacité disponible insuffisante (${battery.availableKwh} kWh restants)`
    );
  }

  const pricePerKwh = input.pricePerKwh ?? await calculateDynamicPrice();

  const [offer] = await prisma.$transaction([
    prisma.storageOffer.create({
      data: {
        hostId: input.hostId,
        batteryId: input.batteryId,
        capacityKwh: input.capacityKwh,
        remainingKwh: input.capacityKwh,
        pricePerKwh,
      },
    }),
    prisma.battery.update({
      where: { id: input.batteryId },
      data: {
        availableKwh: { decrement: input.capacityKwh },
      },
    }),
  ]);

  return offer;
}

/** Liste des offres actives sur la marketplace */
export async function getMarketplace() {
  return prisma.storageOffer.findMany({
    where: { status: "ACTIVE", remainingKwh: { gt: 0 } },
    include: {
      host: {
        select: { id: true, name: true },
      },
      battery: {
        select: { id: true, label: true, capacityKwh: true },
      },
    },
    orderBy: { pricePerKwh: "asc" },
  });
}

/** Réserver du stockage sur une offre */
export async function reserveStorage(input: ReserveInput) {
  const offer = await prisma.storageOffer.findUnique({
    where: { id: input.offerId },
  });

  if (!offer) {
    throw new Error("Offre introuvable");
  }

  if (offer.status !== "ACTIVE") {
    throw new Error("Cette offre n'est plus active");
  }

  if (offer.hostId === input.clientId) {
    throw new Error("Impossible de réserver sur votre propre offre");
  }

  if (input.requestedKwh <= 0) {
    throw new Error("La quantité doit être positive");
  }

  if (input.requestedKwh > offer.remainingKwh) {
    throw new Error(
      `Capacité restante insuffisante (${offer.remainingKwh} kWh disponibles)`
    );
  }

  const newRemaining = offer.remainingKwh - input.requestedKwh;
  const newStatus = newRemaining === 0 ? "FULL" : "ACTIVE";

  const [contract] = await prisma.$transaction([
    prisma.storageContract.create({
      data: {
        offerId: input.offerId,
        clientId: input.clientId,
        allocatedKwh: input.requestedKwh,
        pricePerKwh: offer.pricePerKwh,
      },
    }),
    prisma.storageOffer.update({
      where: { id: input.offerId },
      data: {
        remainingKwh: newRemaining,
        status: newStatus as any,
      },
    }),
  ]);

  return contract;
}

/** Offres publiées par un hôte */
export async function getHostOffers(hostId: string) {
  return prisma.storageOffer.findMany({
    where: { hostId },
    include: {
      battery: { select: { id: true, label: true } },
      contracts: {
        select: {
          id: true,
          clientId: true,
          allocatedKwh: true,
          usedKwh: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Contrats d'un client */
export async function getClientContracts(clientId: string) {
  return prisma.storageContract.findMany({
    where: { clientId },
    include: {
      offer: {
        select: {
          id: true,
          pricePerKwh: true,
          host: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Prix dynamique actuel */
export async function getCurrentPrice() {
  const price = await calculateDynamicPrice();
  return { pricePerKwh: price, currency: "EUR" };
}
