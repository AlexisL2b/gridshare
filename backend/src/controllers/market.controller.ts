import { Response } from "express";
import { AuthRequest } from "../types";
import * as marketService from "../services/market.service";

export async function getElectricityPrices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const country = req.params.country as string;
    const prices = await marketService.getElectricityPrices(country);
    res.json({ country, prices });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(400).json({ error: message });
  }
}

export async function getMultiCountryPrices(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const countries = ["fr", "de", "be", "nl", "at"];
    const prices = await marketService.getMultiCountryPrices(countries);
    res.json(prices);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { side, amountKwh, pricePerKwh } = req.body;
    if (!side || !amountKwh || !pricePerKwh) {
      res.status(400).json({ error: "Champs requis : side, amountKwh, pricePerKwh" });
      return;
    }

    const result = await marketService.createOrder({
      userId: req.user!.userId,
      side,
      amountKwh: parseFloat(amountKwh),
      pricePerKwh: parseFloat(pricePerKwh),
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(400).json({ error: message });
  }
}

export async function getOrderBook(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const orderBook = await marketService.getOrderBook();
    res.json(orderBook);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}

export async function getUserOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orders = await marketService.getUserOrders(req.user!.userId);
    res.json(orders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}

export async function getRecentTrades(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const trades = await marketService.getRecentTrades();
    res.json(trades);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}

export async function cancelOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orderId = req.params.id as string;
    const order = await marketService.cancelOrder(orderId, req.user!.userId);
    res.json(order);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(400).json({ error: message });
  }
}

export async function getAvailableToSell(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await marketService.getAvailableToSell(req.user!.userId);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}

export async function getUserTradingStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await marketService.getUserTradingStats(req.user!.userId);
    res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
}
