import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken } from "../middleware/auth";
import { createUser, findUserByEmail, findUserById } from "../store";

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    if (await findUserByEmail(email)) {
      res.status(409).json({ error: { code: "DUPLICATE_RESOURCE", message: "An account with that email already exists." } });
      return;
    }
    const user = await createUser({
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await findUserByEmail(input.email.toLowerCase());
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      res.status(401).json({ error: { code: "AUTH_ERROR", message: "Email or password is incorrect." } });
      return;
    }
    res.json({
      token: signToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(401).json({ error: { code: "AUTH_ERROR", message: "Your session is invalid or expired." } });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    next(error);
  }
});

export default router;