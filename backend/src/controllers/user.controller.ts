import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../types";

/** GET /api/users/me -- profil de l'utilisateur connecté */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        estimatedProduction: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** PUT /api/users/me -- mise à jour du profil */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, estimatedProduction } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(estimatedProduction !== undefined && { estimatedProduction }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        estimatedProduction: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** GET /api/users/me/batteries -- batteries de l'hôte connecté */
export async function getMyBatteries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const batteries = await prisma.battery.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(batteries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/users/me/batteries -- ajouter une batterie (hôte uniquement) */
export async function addBattery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { capacityKwh, label } = req.body;

    if (!capacityKwh || !label) {
      res.status(400).json({ error: "Champs requis : capacityKwh, label" });
      return;
    }

    if (capacityKwh <= 0) {
      res.status(400).json({ error: "La capacité doit être positive" });
      return;
    }

    const battery = await prisma.battery.create({
      data: {
        userId: req.user!.userId,
        capacityKwh,
        availableKwh: capacityKwh,
        label,
      },
    });

    res.status(201).json(battery);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** GET /api/users/me/chart-data -- données agrégées par jour pour les graphiques */
export async function getChartData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.type;

    const whereClause =
      userType === "HOST"
        ? { contract: { offer: { hostId: userId } } }
        : { contract: { clientId: userId } };

    const transactions = await prisma.energyTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<
      string,
      { date: string; stored: number; restored: number; cost: number }
    >();

    for (const t of transactions) {
      const day = t.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { date: day, stored: 0, restored: 0, cost: 0 };
      if (t.type === "STORE") {
        entry.stored += t.amountKwh;
      } else {
        entry.restored += t.amountKwh;
      }
      entry.cost += t.totalCost;
      dailyMap.set(day, entry);
    }

    const dailyData = Array.from(dailyMap.values());

    let capacityUsed = 0;
    let capacityFree = 0;

    if (userType === "HOST") {
      const batteries = await prisma.battery.findMany({ where: { userId } });
      const totalCap = batteries.reduce((s, b) => s + b.capacityKwh, 0);
      const totalAvail = batteries.reduce((s, b) => s + b.availableKwh, 0);
      capacityUsed = totalCap - totalAvail;
      capacityFree = totalAvail;
    } else {
      const contracts = await prisma.storageContract.findMany({
        where: { clientId: userId, status: "ACTIVE" },
      });
      capacityUsed = contracts.reduce((s, c) => s + c.usedKwh, 0);
      capacityFree = contracts.reduce((s, c) => s + (c.allocatedKwh - c.usedKwh), 0);
    }

    res.json({ dailyData, capacityUsed, capacityFree });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    res.status(500).json({ error: message });
  }
}

/** GET /api/users/me/dashboard -- données agrégées pour le dashboard */
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.type;

    if (userType === "HOST") {
      const batteries = await prisma.battery.findMany({ where: { userId } });
      const offers = await prisma.storageOffer.findMany({
        where: { hostId: userId },
        include: { contracts: true },
      });

      const totalCapacity = batteries.reduce((sum, b) => sum + b.capacityKwh, 0);
      const totalAvailable = batteries.reduce((sum, b) => sum + b.availableKwh, 0);

      const transactions = await prisma.energyTransaction.findMany({
        where: { contract: { offer: { hostId: userId } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const totalRevenue = transactions.reduce((sum, t) => sum + t.totalCost, 0);

      res.json({
        type: "HOST",
        totalCapacity,
        totalAvailable,
        activeOffers: offers.filter((o) => o.status === "ACTIVE").length,
        totalRevenue,
        recentTransactions: transactions,
      });
    } else {
      const contracts = await prisma.storageContract.findMany({
        where: { clientId: userId },
        include: { offer: true },
      });

      const transactions = await prisma.energyTransaction.findMany({
        where: { contract: { clientId: userId } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const totalStored = contracts
        .filter((c) => c.status === "ACTIVE")
        .reduce((sum, c) => sum + c.usedKwh, 0);

      const totalAllocated = contracts
        .filter((c) => c.status === "ACTIVE")
        .reduce((sum, c) => sum + c.allocatedKwh, 0);

      const totalSpent = transactions.reduce((sum, t) => sum + t.totalCost, 0);

      res.json({
        type: "CLIENT",
        totalStored,
        totalAllocated,
        activeContracts: contracts.filter((c) => c.status === "ACTIVE").length,
        totalSpent,
        recentTransactions: transactions,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
