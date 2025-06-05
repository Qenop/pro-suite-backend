// E:\PROJECTS\pro-suite-app\backend\routes\billingRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import { generateBills, getBillsForProperty, getBillsForTenant } from '../controllers/billingController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// Route to generate bills
router.post('/generate/:propertyId', asyncHandler(generateBills));

// ✅ New route to get bills for a specific property and billing period
router.get('/:propertyId', protect, allowRoles('admin'),  asyncHandler(getBillsForProperty));

router.get('/tenant/:tenantId', protect, allowRoles('admin'), asyncHandler(getBillsForTenant)); // bills for specific tenant

export default router;
