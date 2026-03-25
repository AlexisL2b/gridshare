import { prisma } from "../lib/prisma";
import { OrderSide, OrderStatus } from "@prisma/client";

const XADI_BASE = "https://dap.xadi.eu/api";
const VALID_COUNTRIES = ["fr", "de", "nl", "be", "at", "ch", "dk", "no", "se"];
const CACHE_TTL_MS = 5 * 60 * 1000;

interface PriceEntry {
  timestamp: string;
  price: number;
}

const priceCache: Record<string, { data: PriceEntry[]; fetchedAt: number }> = {};

export async function getElectricityPrices(country: string): Promise<PriceEntry[]> {
  const c = country.toLowerCase();
  if (!VALID_COUNTRIES.includes(c)) {
    throw new Error(`Pays non supporté. Valides : ${VALID_COUNTRIES.join(", ")}`);
  }

  const cached = priceCache[c];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`${XADI_BASE}/${c}/today?autoVat=true`);
  if (!res.ok) {
    throw new Error(`Erreur API prix : ${res.status}`);
  }

  const json = (await res.json()) as { prices?: { timestamp: string; price: number }[] };
  const data: PriceEntry[] = (json.prices || []).map((p) => ({
    timestamp: p.timestamp,
    price: p.price,
  }));

  priceCache[c] = { data, fetchedAt: Date.now() };
  return data;
}

export async function getMultiCountryPrices(countries: string[]): Promise<Record<string, PriceEntry[]>> {
  const results: Record<string, PriceEntry[]> = {};
  await Promise.all(
    countries.map(async (c) => {
      try {
        results[c] = await getElectricityPrices(c);
      } catch {
        results[c] = [];
      }
    })
  );
  return results;
}

export async function createOrder(input: {
  userId: string;
  side: OrderSide;
  amountKwh: number;
  pricePerKwh: number;
}) {
  if (input.amountKwh <= 0 || input.pricePerKwh <= 0) {
    throw new Error("Quantité et prix doivent être positifs");
  }

  if (input.side === "SELL") {
    const contracts = await prisma.storageContract.findMany({
      where: { clientId: input.userId, status: "ACTIVE" },
    });
    const totalStored = contracts.reduce((sum, c) => sum + c.usedKwh, 0);

    const openSells = await prisma.tradeOrder.findMany({
      where: { userId: input.userId, side: "SELL", status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
    });
    const alreadyListed = openSells.reduce((sum, o) => sum + (o.amountKwh - o.filledKwh), 0);

    if (input.amountKwh > totalStored - alreadyListed) {
      throw new Error(
        `Énergie insuffisante. Disponible : ${(totalStored - alreadyListed).toFixed(2)} kWh`
      );
    }
  }

  const order = await prisma.tradeOrder.create({
    data: {
      userId: input.userId,
      side: input.side,
      amountKwh: input.amountKwh,
      pricePerKwh: input.pricePerKwh,
    },
    include: { user: { select: { name: true, type: true } } },
  });

  const trades = await matchOrder(order.id);

  return { order: await getOrderById(order.id), trades };
}

async function matchOrder(orderId: string) {
  const order = await prisma.tradeOrder.findUniqueOrThrow({ where: { id: orderId } });
  const trades = [];

  const counterOrders = await prisma.tradeOrder.findMany({
    where: {
      side: order.side === "BUY" ? "SELL" : "BUY",
      status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      pricePerKwh: order.side === "BUY" ? { lte: order.pricePerKwh } : { gte: order.pricePerKwh },
      userId: { not: order.userId },
    },
    orderBy: {
      pricePerKwh: order.side === "BUY" ? "asc" : "desc",
    },
  });

  let remaining = order.amountKwh - order.filledKwh;

  for (const counter of counterOrders) {
    if (remaining <= 0) break;

    const counterRemaining = counter.amountKwh - counter.filledKwh;
    const matchAmount = Math.min(remaining, counterRemaining);
    const matchPrice = counter.pricePerKwh;

    const [buyOrderId, sellOrderId] =
      order.side === "BUY" ? [order.id, counter.id] : [counter.id, order.id];

    const trade = await prisma.trade.create({
      data: { buyOrderId, sellOrderId, amountKwh: matchAmount, pricePerKwh: matchPrice },
    });
    trades.push(trade);

    const newCounterFilled = counter.filledKwh + matchAmount;
    await prisma.tradeOrder.update({
      where: { id: counter.id },
      data: {
        filledKwh: newCounterFilled,
        status: newCounterFilled >= counter.amountKwh ? "FILLED" : "PARTIALLY_FILLED",
      },
    });

    remaining -= matchAmount;
  }

  const newFilled = order.amountKwh - remaining;
  await prisma.tradeOrder.update({
    where: { id: order.id },
    data: {
      filledKwh: newFilled,
      status:
        newFilled >= order.amountKwh
          ? "FILLED"
          : newFilled > 0
          ? "PARTIALLY_FILLED"
          : order.status,
    },
  });

  return trades;
}

async function getOrderById(id: string) {
  return prisma.tradeOrder.findUnique({
    where: { id },
    include: { user: { select: { name: true, type: true } } },
  });
}

export async function getOrderBook() {
  const [buyOrders, sellOrders] = await Promise.all([
    prisma.tradeOrder.findMany({
      where: { side: "BUY", status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
      orderBy: { pricePerKwh: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.tradeOrder.findMany({
      where: { side: "SELL", status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
      orderBy: { pricePerKwh: "asc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return { buyOrders, sellOrders };
}

export async function getUserOrders(userId: string) {
  return prisma.tradeOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      buyTrades: true,
      sellTrades: true,
    },
  });
}

export async function getRecentTrades() {
  return prisma.trade.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      buyOrder: { include: { user: { select: { name: true } } } },
      sellOrder: { include: { user: { select: { name: true } } } },
    },
  });
}

export async function cancelOrder(orderId: string, userId: string) {
  const order = await prisma.tradeOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Ordre introuvable");
  if (order.userId !== userId) throw new Error("Non autorisé");
  if (order.status === "FILLED" || order.status === "CANCELLED") {
    throw new Error("Impossible d'annuler cet ordre");
  }

  return prisma.tradeOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
}

export async function getAvailableToSell(userId: string) {
  const contracts = await prisma.storageContract.findMany({
    where: { clientId: userId, status: "ACTIVE" },
  });
  const totalStored = contracts.reduce((sum, c) => sum + c.usedKwh, 0);

  const openSells = await prisma.tradeOrder.findMany({
    where: { userId, side: "SELL", status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
  });
  const locked = openSells.reduce((sum, o) => sum + (o.amountKwh - o.filledKwh), 0);

  return {
    totalStored: parseFloat(totalStored.toFixed(2)),
    lockedInOrders: parseFloat(locked.toFixed(2)),
    availableToSell: parseFloat((totalStored - locked).toFixed(2)),
  };
}

export async function getUserTradingStats(userId: string) {
  const orders = await prisma.tradeOrder.findMany({
    where: { userId },
    include: { buyTrades: true, sellTrades: true },
  });

  const allTrades = await prisma.trade.findMany({
    where: {
      OR: [
        { buyOrder: { userId } },
        { sellOrder: { userId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      buyOrder: { include: { user: { select: { name: true } } } },
      sellOrder: { include: { user: { select: { name: true } } } },
    },
  });

  const buyTrades = allTrades.filter((t) => t.buyOrder.userId === userId);
  const sellTrades = allTrades.filter((t) => t.sellOrder.userId === userId);

  const totalBought = buyTrades.reduce((s, t) => s + t.amountKwh, 0);
  const totalSold = sellTrades.reduce((s, t) => s + t.amountKwh, 0);
  const totalSpent = buyTrades.reduce((s, t) => s + t.amountKwh * t.pricePerKwh, 0);
  const totalEarned = sellTrades.reduce((s, t) => s + t.amountKwh * t.pricePerKwh, 0);

  const openOrders = orders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED");
  const filledOrders = orders.filter((o) => o.status === "FILLED");

  return {
    summary: {
      totalOrders: orders.length,
      openOrders: openOrders.length,
      filledOrders: filledOrders.length,
      cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
      totalTrades: allTrades.length,
      totalBoughtKwh: parseFloat(totalBought.toFixed(2)),
      totalSoldKwh: parseFloat(totalSold.toFixed(2)),
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalEarned: parseFloat(totalEarned.toFixed(2)),
      netProfit: parseFloat((totalEarned - totalSpent).toFixed(2)),
    },
    recentTrades: allTrades.slice(0, 20),
    openOrders: openOrders.map((o) => ({
      id: o.id,
      side: o.side,
      amountKwh: o.amountKwh,
      filledKwh: o.filledKwh,
      pricePerKwh: o.pricePerKwh,
      status: o.status,
      createdAt: o.createdAt,
    })),
  };
}
