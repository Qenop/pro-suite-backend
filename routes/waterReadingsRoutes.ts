//E:\PROJECTS\pro-suite-app\backend\routes\waterReadingsRoutes.ts
import express from "express";
import {
  createWaterReading,
  getWaterReadings,
} from "../controllers/waterReadingsController";
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

// POST: Create new water reading for a property
router.post("/properties/:propertyId/water-readings", protect, allowRoles('admin', 'caretaker'), createWaterReading);

// GET: Fetch water readings for a property
router.get("/properties/:propertyId/water-readings", protect, allowRoles('admin', 'caretaker'), getWaterReadings);


export default router;

