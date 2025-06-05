//E:\PROJECTS\pro-suite-app\backend\routes\reportsRoutes.ts
import express from 'express';
import {
  getBalancesReport,
  getOccupancyReport,
  getUtilityReport,
  getBillingStats,
  getFinancialReport,
} from '../controllers/reportsController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

// BALANCES report
router.get('/:propertyId/balances', protect, allowRoles('admin', 'landlord'),  getBalancesReport);

// OCCUPANCY report
router.get('/:propertyId/occupancy', protect, allowRoles('admin', 'landlord'), getOccupancyReport);

// UTILITY report (e.g., water)
router.get('/:propertyId/utilities', protect, allowRoles('admin', 'landlord'), getUtilityReport);

// BILLING STATS report
router.get('/:propertyId/billing-stats', protect, allowRoles('admin', 'landlord'), getBillingStats);

// FINANCIAL report (income vs expenses)
router.get('/:propertyId/financials', protect, allowRoles('admin', 'landlord'), getFinancialReport);

export default router;
