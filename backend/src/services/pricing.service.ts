import { prisma } from "../lib/prisma";

const BASE_PRICE_PER_KWH = 0.15; // prix de base en euros
const MIN_PRICE = 0.05;
const MAX_PRICE = 0.50;

/**
 * Calcule le prix dynamique par kWh selon l'offre et la demande.
 *
 * Formule : prix = base_price * (demande / offre)
 *
 * - demande = somme des kWh alloués dans les contrats actifs
 * - offre   = somme des kWh restants dans les offres actives
 *
 * Le prix est borné entre MIN_PRICE et MAX_PRICE.
 */
export async function calculateDynamicPrice(): Promise<number> {
  const activeOffers = await prisma.storageOffer.findMany({
    where: { status: "ACTIVE" },
    select: { remainingKwh: true },
  });

  const activeContracts = await prisma.storageContract.findMany({
    where: { status: "ACTIVE" },
    select: { allocatedKwh: true },
  });

  const totalSupply = activeOffers.reduce((sum, o) => sum + o.remainingKwh, 0);
  const totalDemand = activeContracts.reduce((sum, c) => sum + c.allocatedKwh, 0);

  if (totalSupply === 0) {
    return MAX_PRICE;
  }

  const ratio = totalDemand / totalSupply;
  const price = BASE_PRICE_PER_KWH * Math.max(ratio, 0.3);

  return Math.min(Math.max(price, MIN_PRICE), MAX_PRICE);
}

export function getBasePricePerKwh(): number {
  return BASE_PRICE_PER_KWH;
}
