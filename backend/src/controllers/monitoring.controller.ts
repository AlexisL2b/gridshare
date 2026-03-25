import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../types";

/** GET /api/users/me/monitoring -- monitoring détaillé par utilisateur */
export async function getUserMonitoring(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.type;

    if (userType === "HOST") {
      const data = await getHostMonitoring(userId);
      res.json({ type: "HOST", ...data });
    } else {
      const data = await getClientMonitoring(userId);
      res.json({ type: "CLIENT", ...data });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    res.status(500).json({ error: message });
  }
}

async function getHostMonitoring(userId: string) {
  const [batteries, offers, transactions] = await Promise.all([
    prisma.battery.findMany({ where: { userId } }),
    prisma.storageOffer.findMany({
      where: { hostId: userId },
      include: {
        battery: { select: { label: true } },
        contracts: {
          select: { id: true, clientId: true, allocatedKwh: true, usedKwh: true, status: true },
        },
      },
    }),
    prisma.energyTransaction.findMany({
      where: { contract: { offer: { hostId: userId } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalCapacity = batteries.reduce((s, b) => s + b.capacityKwh, 0);
  const totalAvailable = batteries.reduce((s, b) => s + b.availableKwh, 0);
  const totalAllocated = totalCapacity - totalAvailable;

  // Stats par batterie
  const batteryStats = batteries.map((b) => {
    const batteryOffers = offers.filter((o) => o.batteryId === b.id);
    const allocated = b.capacityKwh - b.availableKwh;
    return {
      id: b.id,
      label: b.label,
      capacityKwh: b.capacityKwh,
      availableKwh: b.availableKwh,
      allocatedKwh: allocated,
      usagePercent: b.capacityKwh > 0 ? (allocated / b.capacityKwh) * 100 : 0,
      offersCount: batteryOffers.length,
    };
  });

  // Stats par offre
  const offerStats = offers.map((o) => ({
    id: o.id,
    batteryLabel: o.battery.label,
    capacityKwh: o.capacityKwh,
    remainingKwh: o.remainingKwh,
    pricePerKwh: o.pricePerKwh,
    status: o.status,
    contractsCount: o.contracts.length,
    activeContracts: o.contracts.filter((c) => c.status === "ACTIVE").length,
    totalUsed: o.contracts.reduce((s, c) => s + c.usedKwh, 0),
  }));

  // Agrégation par jour
  const dailyMap = new Map<string, { date: string; stored: number; restored: number; revenue: number; txCount: number }>();
  for (const t of transactions) {
    const day = t.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(day) ?? { date: day, stored: 0, restored: 0, revenue: 0, txCount: 0 };
    if (t.type === "STORE") entry.stored += t.amountKwh;
    else entry.restored += t.amountKwh;
    entry.revenue += t.totalCost;
    entry.txCount += 1;
    dailyMap.set(day, entry);
  }
  const dailyData = Array.from(dailyMap.values());

  // Agrégation par heure (pattern d'utilisation)
  const hourlyMap = new Map<number, { hour: number; stored: number; restored: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { hour: h, stored: 0, restored: 0 });
  for (const t of transactions) {
    const h = t.createdAt.getHours();
    const entry = hourlyMap.get(h)!;
    if (t.type === "STORE") entry.stored += t.amountKwh;
    else entry.restored += t.amountKwh;
  }
  const hourlyPattern = Array.from(hourlyMap.values());

  // Revenus cumulés
  let cumRevenue = 0;
  const cumulativeRevenue = dailyData.map((d) => {
    cumRevenue += d.revenue;
    return { date: d.date, cumulative: parseFloat(cumRevenue.toFixed(2)) };
  });

  const totalRevenue = transactions.reduce((s, t) => s + t.totalCost, 0);
  const totalStored = transactions.filter((t) => t.type === "STORE").reduce((s, t) => s + t.amountKwh, 0);
  const totalRestored = transactions.filter((t) => t.type === "RESTORE").reduce((s, t) => s + t.amountKwh, 0);
  const avgRevenuePerDay = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;

  return {
    summary: {
      totalCapacity,
      totalAvailable,
      totalAllocated,
      totalRevenue,
      totalStored,
      totalRestored,
      totalTransactions: transactions.length,
      avgRevenuePerDay,
      activeBatteries: batteries.length,
      activeOffers: offers.filter((o) => o.status === "ACTIVE").length,
    },
    batteryStats,
    offerStats,
    dailyData,
    hourlyPattern,
    cumulativeRevenue,
  };
}

async function getClientMonitoring(userId: string) {
  const [contracts, transactions] = await Promise.all([
    prisma.storageContract.findMany({
      where: { clientId: userId },
      include: {
        offer: {
          select: {
            id: true,
            pricePerKwh: true,
            host: { select: { name: true } },
            battery: { select: { label: true } },
          },
        },
      },
    }),
    prisma.energyTransaction.findMany({
      where: { contract: { clientId: userId } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Stats par contrat
  const contractStats = contracts.map((c) => ({
    id: c.id,
    hostName: c.offer.host.name,
    batteryLabel: c.offer.battery.label,
    allocatedKwh: c.allocatedKwh,
    usedKwh: c.usedKwh,
    freeKwh: c.allocatedKwh - c.usedKwh,
    usagePercent: c.allocatedKwh > 0 ? (c.usedKwh / c.allocatedKwh) * 100 : 0,
    pricePerKwh: c.pricePerKwh,
    status: c.status,
    startDate: c.startDate,
  }));

  // Agrégation par jour
  const dailyMap = new Map<string, { date: string; stored: number; restored: number; cost: number; txCount: number }>();
  for (const t of transactions) {
    const day = t.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(day) ?? { date: day, stored: 0, restored: 0, cost: 0, txCount: 0 };
    if (t.type === "STORE") entry.stored += t.amountKwh;
    else entry.restored += t.amountKwh;
    entry.cost += t.totalCost;
    entry.txCount += 1;
    dailyMap.set(day, entry);
  }
  const dailyData = Array.from(dailyMap.values());

  // Pattern horaire
  const hourlyMap = new Map<number, { hour: number; stored: number; restored: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { hour: h, stored: 0, restored: 0 });
  for (const t of transactions) {
    const h = t.createdAt.getHours();
    const entry = hourlyMap.get(h)!;
    if (t.type === "STORE") entry.stored += t.amountKwh;
    else entry.restored += t.amountKwh;
  }
  const hourlyPattern = Array.from(hourlyMap.values());

  // Coûts cumulés
  let cumCost = 0;
  const cumulativeCost = dailyData.map((d) => {
    cumCost += d.cost;
    return { date: d.date, cumulative: parseFloat(cumCost.toFixed(2)) };
  });

  // Répartition énergie par hôte
  const hostMap = new Map<string, { hostName: string; stored: number; cost: number }>();
  for (const c of contracts) {
    const txs = transactions.filter((t) => t.contractId === c.id);
    const name = c.offer.host.name;
    const entry = hostMap.get(name) ?? { hostName: name, stored: 0, cost: 0 };
    entry.stored += txs.filter((t) => t.type === "STORE").reduce((s, t) => s + t.amountKwh, 0);
    entry.cost += txs.reduce((s, t) => s + t.totalCost, 0);
    hostMap.set(name, entry);
  }
  const energyByHost = Array.from(hostMap.values());

  const totalAllocated = contracts.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.allocatedKwh, 0);
  const totalStored = contracts.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.usedKwh, 0);
  const totalCost = transactions.reduce((s, t) => s + t.totalCost, 0);
  const totalEnergyStored = transactions.filter((t) => t.type === "STORE").reduce((s, t) => s + t.amountKwh, 0);
  const totalEnergyRestored = transactions.filter((t) => t.type === "RESTORE").reduce((s, t) => s + t.amountKwh, 0);
  const avgCostPerDay = dailyData.length > 0 ? totalCost / dailyData.length : 0;
  const avgPricePerKwh = totalEnergyStored > 0 ? totalCost / totalEnergyStored : 0;

  return {
    summary: {
      totalAllocated,
      totalStored,
      totalFree: totalAllocated - totalStored,
      totalCost,
      totalEnergyStored,
      totalEnergyRestored,
      totalTransactions: transactions.length,
      avgCostPerDay,
      avgPricePerKwh,
      activeContracts: contracts.filter((c) => c.status === "ACTIVE").length,
    },
    contractStats,
    dailyData,
    hourlyPattern,
    cumulativeCost,
    energyByHost,
  };
}
