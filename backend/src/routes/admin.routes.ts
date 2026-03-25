import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.use(authenticate as any);

// GET /api/admin/stats
router.get("/stats", adminController.getPlatformStats as any);

export default router;
