//E:\PROJECTS\pro-suite-app\backend\routes\usersRoutes.ts
import express from 'express';
import { createUser, getUsers, getUsersByProperty,} from '../controllers/usersController';
import { protect, allowRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, allowRoles('admin'), createUser); // POST /users - create new user
router.get('/', protect, allowRoles('admin'),  getUsers);
router.get('/by-property/:propertyId', protect, allowRoles('admin'), getUsersByProperty);


export default router;
