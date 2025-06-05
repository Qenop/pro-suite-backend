//E:\PROJECTS\pro-suite-app\backend\routes\tenantRoutes.ts
import express from 'express';  
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} from '../controllers/tenantController';
import { protect, allowRoles } from '../middleware/authMiddleware';

import upload from '../middleware/multerConfig';  // Import multer middleware

const router = express.Router();

// Create a new tenant with profile picture upload
router.post('/', upload.single('profilePicture'), protect, allowRoles('admin'), createTenant);

// Get all tenants
router.get('/', protect, allowRoles('admin'), getTenants);

// Get a tenant by ID
router.get('/:id', protect, allowRoles('admin'), getTenantById);

// Update a tenant by ID with optional profile picture upload
router.put('/:id', upload.single('profilePicture'), protect, allowRoles('admin'), updateTenant);

// Delete a tenant by ID
router.delete('/:id', protect, allowRoles('admin'), deleteTenant);

export default router;
