import { Request } from "express";

export interface AuthPayload {
  userId: string;
  email: string;
  type: "HOST" | "CLIENT";
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
