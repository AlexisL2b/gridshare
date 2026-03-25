import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as transactionController from "../controllers/transaction.controller";

const router = Router();

router.use(authenticate as any);

// POST /api/transactions/store
router.post("/store", transactionController.storeEnergy as any);

// POST /api/transactions/restore
router.post("/restore", transactionController.restoreEnergy as any);

// GET  /api/transactions/contract/:contractId
router.get(
  "/contract/:contractId",
  transactionController.getContractTransactions as any
);

// GET  /api/transactions/history
router.get("/history", transactionController.getUserTransactions as any);

export default router;
