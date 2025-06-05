//E:\PROJECTS\pro-suite-app\backend\routes\authRoutes.ts
import express from 'express';
import { loginUser } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginUser);

export default router;
