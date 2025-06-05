//controllers\authController.ts
import { Request, Response } from 'express';
import User from '../models/usersModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Make sure to set this in your .env

// Login controller
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    // Create JWT payload
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      propertyId: user.propertyId,
    };

    // Sign token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, propertyId: user.propertyId, } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
