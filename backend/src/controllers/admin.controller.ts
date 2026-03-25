import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { calculateDynamicPrice } from "../services/pricing.service";

/** GET /api/admin/stats -- statistiques globales de la plateforme */
export async function getPlatformStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      totalHosts,
      totalClients,
      totalBatteries,
      activeOffers,
      activeContracts,
      transactions,
      allTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { type: "HOST" } }),
      prisma.user.count({ where: { type: "CLIENT" } }),
      prisma.battery.count(),
      prisma.storageOffer.count({ where: { status: "ACTIVE" } }),
      prisma.storageContract.count({ where: { status: "ACTIVE" } }),
      prisma.energyTransaction.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.energyTransaction.count(),
    ]);

    const totalEnergyStored = transactions
      .filter((t) => t.type === "STORE")
      .reduce((sum, t) => sum + t.amountKwh, 0);

    const totalEnergyRestored = transactions
      .filter((t) => t.type === "RESTORE")
      .reduce((sum, t) => sum + t.amountKwh, 0);

    const totalVolume = transactions.reduce((sum, t) => sum + t.totalCost, 0);

    const currentPrice = await calculateDynamicPrice();

    // Données agrégées par jour pour le graphique d'activité
    const dailyMap = new Map<
      string,
      { date: string; stored: number; restored: number; transactions: number; volume: number }
    >();

    for (const t of transactions) {
      const day = t.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? {
        date: day,
        stored: 0,
        restored: 0,
        transactions: 0,
        volume: 0,
      };
      if (t.type === "STORE") entry.stored += t.amountKwh;
      else entry.restored += t.amountKwh;
      entry.transactions += 1;
      entry.volume += t.totalCost;
      dailyMap.set(day, entry);
    }

    const dailyActivity = Array.from(dailyMap.values());

    // Capacité totale sur la plateforme
    const batteries = await prisma.battery.findMany();
    const totalCapacity = batteries.reduce((s, b) => s + b.capacityKwh, 0);
    const totalAvailable = batteries.reduce((s, b) => s + b.availableKwh, 0);

    // Supply vs demand
    const offers = await prisma.storageOffer.findMany({ where: { status: "ACTIVE" } });
    const contracts = await prisma.storageContract.findMany({ where: { status: "ACTIVE" } });
    const totalSupply = offers.reduce((s, o) => s + o.remainingKwh, 0);
    const totalDemand = contracts.reduce((s, c) => s + c.allocatedKwh, 0);

    res.json({
      users: { total: totalUsers, hosts: totalHosts, clients: totalClients },
      infrastructure: {
        batteries: totalBatteries,
        totalCapacity,
        totalAvailable,
        activeOffers,
        activeContracts,
      },
      energy: {
        totalStored: totalEnergyStored,
        totalRestored: totalEnergyRestored,
        netStored: totalEnergyStored - totalEnergyRestored,
      },
      market: {
        currentPrice,
        totalSupply,
        totalDemand,
        totalVolume,
        totalTransactions: allTransactions,
      },
      dailyActivity,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    res.status(500).json({ error: message });
  }
}
