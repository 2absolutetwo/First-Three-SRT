import { Router, type IRouter } from "express";
import healthRouter from "./health";
import segmentRouter from "./segment";

const router: IRouter = Router();

router.use(healthRouter);
router.use(segmentRouter);

export default router;
