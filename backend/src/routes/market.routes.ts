import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as marketController from "../controllers/market.controller";

const router = Router();

router.get("/prices/multi", authenticate as any, marketController.getMultiCountryPrices as any);
router.get("/prices/:country", authenticate as any, marketController.getElectricityPrices as any);

router.use(authenticate as any);
router.get("/orders/book", marketController.getOrderBook as any);
router.get("/orders/mine", marketController.getUserOrders as any);
router.post("/orders", marketController.createOrder as any);
router.delete("/orders/:id", marketController.cancelOrder as any);
router.get("/trades", marketController.getRecentTrades as any);
router.get("/available", marketController.getAvailableToSell as any);
router.get("/stats", marketController.getUserTradingStats as any);

export default router;
