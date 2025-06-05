// backend/routes/statsRoutes.ts
import express from 'express';
import { getDashboardStats } from '../controllers/statsController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();
router.get('/dashboard', protect, allowRoles('admin'), getDashboardStats);

export default router;
