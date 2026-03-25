import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, type, estimatedProduction } = req.body;

    if (!email || !password || !name || !type) {
      res.status(400).json({ error: "Champs requis : email, password, name, type" });
      return;
    }

    if (!["HOST", "CLIENT"].includes(type)) {
      res.status(400).json({ error: "Le type doit être HOST ou CLIENT" });
      return;
    }

    const result = await authService.register({
      email,
      password,
      name,
      type,
      estimatedProduction,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Champs requis : email, password" });
      return;
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}
