import { Response } from "express";
import { AuthRequest } from "../types";
import * as storageService from "../services/storage.service";

/** POST /api/storage/offers -- publier une offre (hôte) */
export async function createOffer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { batteryId, capacityKwh, pricePerKwh } = req.body;

    if (!batteryId || !capacityKwh) {
      res.status(400).json({ error: "Champs requis : batteryId, capacityKwh" });
      return;
    }

    const offer = await storageService.createOffer({
      hostId: req.user!.userId,
      batteryId,
      capacityKwh,
      pricePerKwh,
    });

    res.status(201).json(offer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** GET /api/storage/marketplace -- offres actives */
export async function getMarketplace(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const offers = await storageService.getMarketplace();
    res.json(offers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/storage/reserve -- réserver du stockage (client) */
export async function reserveStorage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { offerId, requestedKwh } = req.body;

    if (!offerId || !requestedKwh) {
      res.status(400).json({ error: "Champs requis : offerId, requestedKwh" });
      return;
    }

    const contract = await storageService.reserveStorage({
      clientId: req.user!.userId,
      offerId,
      requestedKwh,
    });

    res.status(201).json(contract);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** GET /api/storage/my-offers -- offres de l'hôte connecté */
export async function getMyOffers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const offers = await storageService.getHostOffers(req.user!.userId);
    res.json(offers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** GET /api/storage/my-contracts -- contrats du client connecté */
export async function getMyContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contracts = await storageService.getClientContracts(req.user!.userId);
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/** GET /api/storage/price -- prix dynamique actuel */
export async function getCurrentPrice(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const price = await storageService.getCurrentPrice();
    res.json(price);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
