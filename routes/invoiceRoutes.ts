// backend/routes/invoiceRoutes.ts
import express from 'express';
import {
  getInvoicesByProperty,
  deleteInvoice,
  createInvoicesByPeriod,  
  updateInvoiceStatus,
  sendInvoice,
  getInvoicesByTenantId,
} from '../controllers/invoiceController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

// Route base: /api/properties/:propertyId/invoices
router.post('/:propertyId/invoices/bulk',protect, allowRoles('admin'),  createInvoicesByPeriod); // Bulk create for a period
router.get('/:propertyId/invoices', protect, allowRoles('admin'), getInvoicesByProperty); // List all invoices for a property
router.delete('/:propertyId/invoices/:id', protect, allowRoles('admin'), deleteInvoice);  // Delete invoice
router.patch('/:propertyId/invoices/:id/status', protect, allowRoles('admin'), updateInvoiceStatus); // New route to update invoice status
router.post('/:propertyId/invoices/:invoiceId/send', protect, allowRoles('admin'), sendInvoice);
router.get('/:propertyId/invoices/tenant/:tenantId', protect, allowRoles('admin'), getInvoicesByTenantId); // By tenant

export default router;
