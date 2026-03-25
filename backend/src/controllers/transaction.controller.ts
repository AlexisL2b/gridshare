import { Response } from "express";
import { AuthRequest } from "../types";
import * as transactionService from "../services/transaction.service";

/** POST /api/transactions/store -- stocker de l'énergie */
export async function storeEnergy(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { contractId, amountKwh } = req.body;

    if (!contractId || !amountKwh) {
      res.status(400).json({ error: "Champs requis : contractId, amountKwh" });
      return;
    }

    const transaction = await transactionService.storeEnergy({
      contractId,
      userId: req.user!.userId,
      amountKwh,
    });

    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** POST /api/transactions/restore -- restituer de l'énergie */
export async function restoreEnergy(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { contractId, amountKwh } = req.body;

    if (!contractId || !amountKwh) {
      res.status(400).json({ error: "Champs requis : contractId, amountKwh" });
      return;
    }

    const transaction = await transactionService.restoreEnergy({
      contractId,
      userId: req.user!.userId,
      amountKwh,
    });

    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** GET /api/transactions/contract/:contractId -- historique d'un contrat */
export async function getContractTransactions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const contractId = req.params.contractId as string;

    const transactions = await transactionService.getContractTransactions(
      contractId,
      req.user!.userId
    );

    res.json(transactions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

/** GET /api/transactions/history -- historique complet de l'utilisateur */
export async function getUserTransactions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const transactions = await transactionService.getUserTransactions(
      req.user!.userId,
      req.user!.type
    );

    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
