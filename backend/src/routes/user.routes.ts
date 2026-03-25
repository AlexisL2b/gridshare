import { Router } from "express";
import { authenticate, hostOnly } from "../middleware/auth.middleware";
import * as userController from "../controllers/user.controller";
import * as monitoringController from "../controllers/monitoring.controller";

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as any);

// GET  /api/users/me
router.get("/me", userController.getProfile as any);

// PUT  /api/users/me
router.put("/me", userController.updateProfile as any);

// GET  /api/users/me/batteries
router.get("/me/batteries", userController.getMyBatteries as any);

// POST /api/users/me/batteries (hôte uniquement)
router.post("/me/batteries", hostOnly as any, userController.addBattery as any);

// GET  /api/users/me/dashboard
router.get("/me/dashboard", userController.getDashboard as any);

// GET  /api/users/me/chart-data
router.get("/me/chart-data", userController.getChartData as any);

// GET  /api/users/me/monitoring
router.get("/me/monitoring", monitoringController.getUserMonitoring as any);

export default router;
