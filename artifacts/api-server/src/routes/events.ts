import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  acknowledge,
  getEventDetail,
  listEvents,
} from "../services/watchlist-service";

const router = Router();
const idSchema = z.string().min(1).max(80);

router.get("/events", requireAuth, async (req, res, next) => {
  try {
    res.json(await listEvents(req.userId!));
  } catch (error) {
    next(error);
  }
});

router.get("/events/:id", requireAuth, async (req, res, next) => {
  try {
    res.json(await getEventDetail(req.userId!, idSchema.parse(req.params.id)));
  } catch (error) {
    next(error);
  }
});

router.post("/events/:id/acknowledge", requireAuth, async (req, res, next) => {
  try {
    res.json(await acknowledge(req.userId!, idSchema.parse(req.params.id)));
  } catch (error) {
    next(error);
  }
});

export default router;