//E:\PROJECTS\pro-suite-app\backend\routes\tenantPaymentRoutes.ts
import express from 'express';
import { getPaymentsByTenant, getDepositPaymentByTenant } from '../controllers/paymentController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/tenant/:tenantId', protect, allowRoles('admin'), getPaymentsByTenant);
router.get('/tenant/:tenantId/deposit', protect, allowRoles('admin'), getDepositPaymentByTenant);

export default router;
