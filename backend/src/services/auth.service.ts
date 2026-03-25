import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AuthPayload } from "../types";
import { UserType } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "gridshare-dev-secret";
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  type: UserType;
  estimatedProduction?: number;
}

interface LoginInput {
  email: string;
  password: string;
}

function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new Error("Un compte avec cet email existe déjà");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      type: input.type,
      estimatedProduction: input.estimatedProduction ?? 0,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    type: user.type,
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error("Email ou mot de passe incorrect");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new Error("Email ou mot de passe incorrect");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    type: user.type,
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}
