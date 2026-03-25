import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthPayload, AuthRequest } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "gridshare-dev-secret";

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/** Restreint l'accès aux utilisateurs de type HOST */
export function hostOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.type !== "HOST") {
    res.status(403).json({ error: "Accès réservé aux hôtes" });
    return;
  }
  next();
}

/** Restreint l'accès aux utilisateurs de type CLIENT */
export function clientOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.type !== "CLIENT") {
    res.status(403).json({ error: "Accès réservé aux clients" });
    return;
  }
  next();
}
