import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  addWatchlistItem,
  deleteWatchlistItem,
  listWatchlist,
  updateSettings,
} from "../services/watchlist-service";

const router = Router();
const symbolSchema = z.string().regex(/^[A-Za-z0-9._-]{1,12}$/);

router.get("/watchlist", requireAuth, async (req, res, next) => {
  try {
    res.json(await listWatchlist(req.userId!));
  } catch (error) {
    next(error);
  }
});

router.post("/watchlist/items", requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ symbol: symbolSchema }).parse(req.body);
    res.status(201).json(await addWatchlistItem(req.userId!, input.symbol));
  } catch (error) {
    next(error);
  }
});

router.delete("/watchlist/items/:symbol", requireAuth, async (req, res, next) => {
  try {
    await deleteWatchlistItem(req.userId!, symbolSchema.parse(req.params.symbol));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch("/watchlist/items/:symbol/settings", requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ thresholdPercent: z.number().min(1).max(25) }).parse(req.body);
    res.json(await updateSettings(req.userId!, symbolSchema.parse(req.params.symbol), input.thresholdPercent));
  } catch (error) {
    next(error);
  }
});

export default router;