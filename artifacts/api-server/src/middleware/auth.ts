import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("JWT_SECRET or SESSION_SECRET must be configured.");
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "7d" });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "AUTH_ERROR", message: "Authentication is required." } });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret());
    if (typeof payload !== "object" || typeof payload.sub !== "string") throw new Error("invalid");
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: { code: "AUTH_ERROR", message: "Your session is invalid or expired." } });
  }
};