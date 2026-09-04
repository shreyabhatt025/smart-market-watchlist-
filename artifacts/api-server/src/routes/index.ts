import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import watchlistRouter from "./watchlist";
import marketRouter from "./market";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(watchlistRouter);
router.use(marketRouter);
router.use(eventsRouter);

export default router;
