import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  checkpointStock,
  getDashboard,
  getDetail,
  searchStocks,
} from "../services/watchlist-service";

const router = Router();
const symbolSchema = z.string().regex(/^[A-Za-z0-9._-]{1,12}$/);

router.get("/stocks/search", requireAuth, async (req, res, next) => {
  try {
    const query = z.string().trim().min(1).max(40).parse(req.query.q);
    res.json(await searchStocks(query));
  } catch (error) {
    next(error);
  }
});

router.get("/market/watchlist", requireAuth, async (req, res, next) => {
  try {
    res.json(await getDashboard(req.userId!));
  } catch (error) {
    next(error);
  }
});

router.get("/stocks/:symbol", requireAuth, async (req, res, next) => {
  try {
    res.json(await getDetail(req.userId!, symbolSchema.parse(req.params.symbol)));
  } catch (error) {
    next(error);
  }
});

router.post("/stocks/:symbol/checkpoint", requireAuth, async (req, res, next) => {
  try {
    res.json(await checkpointStock(req.userId!, symbolSchema.parse(req.params.symbol)));
  } catch (error) {
    next(error);
  }
});

export default router;