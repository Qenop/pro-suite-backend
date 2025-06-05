//E:\PROJECTS\pro-suite-app\backend\routes\propertyRoutes.ts
import { Router } from 'express';
import {
  getProperties,
  createProperty,
  getPropertyById,
  deleteProperty, // ✅ Import the delete controller
  updateProperty, // ✅ now included
} from '../controllers/propertyController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = Router();

// ✅ Specific route first
router.put('/:id', protect, allowRoles('admin', 'landlord', 'caretaker'), updateProperty);     // ✅ PUT route
router.get('/:id', protect, allowRoles('admin', 'landlord', 'caretaker'), getPropertyById);

// ✅ Delete property: DELETE /api/properties/:id
router.delete('/:id', protect, allowRoles('admin'), deleteProperty); // ✅ Add this line

// ✅ General routes
router.get('/', protect, allowRoles('admin', 'landlord' ), getProperties);
router.post('/', protect, allowRoles('admin', 'landlord'), createProperty);

export default router;
