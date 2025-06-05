// backend/routes/paymentRoutes.ts
import express from 'express';
import { recordPayment, getPaymentsByProperty } from '../controllers/paymentController';
import { protect, allowRoles } from '../middleware/authMiddleware';

// Enable merging of params so we get propertyId from parent route
const router = express.Router({ mergeParams: true });

// POST /api/properties/:propertyId/payments
router.post('/', protect, allowRoles('admin'), recordPayment);

// GET /api/properties/:propertyId/payments
router.get('/', protect, allowRoles('admin'), getPaymentsByProperty);

export default router;

