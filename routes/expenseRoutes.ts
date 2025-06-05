// E:\PROJECTS\pro-suite-app\backend\routes\expenseRoutes.ts
import { Router } from 'express';
import {
  createExpense,
  getExpensesByProperty,
} from '../controllers/expenseController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = Router();

// Routes are scoped under /api/properties/:propertyId/expenses
router.post('/:propertyId/expenses',protect, allowRoles('admin', 'landlord'),  createExpense);       // POST - Add a new expense
router.get('/:propertyId/expenses', protect, allowRoles('admin', 'landlord'), getExpensesByProperty); // GET - Fetch all expenses

export default router;
