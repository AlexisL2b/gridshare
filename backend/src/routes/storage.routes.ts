import { Router } from "express";
import { authenticate, hostOnly, clientOnly } from "../middleware/auth.middleware";
import * as storageController from "../controllers/storage.controller";

const router = Router();

router.use(authenticate as any);

// GET  /api/storage/marketplace
router.get("/marketplace", storageController.getMarketplace as any);

// GET  /api/storage/price
router.get("/price", storageController.getCurrentPrice as any);

// POST /api/storage/offers (hôte uniquement)
router.post("/offers", hostOnly as any, storageController.createOffer as any);

// GET  /api/storage/my-offers (hôte)
router.get("/my-offers", hostOnly as any, storageController.getMyOffers as any);

// POST /api/storage/reserve (client uniquement)
router.post("/reserve", clientOnly as any, storageController.reserveStorage as any);

// GET  /api/storage/my-contracts (client)
router.get("/my-contracts", clientOnly as any, storageController.getMyContracts as any);

export default router;
