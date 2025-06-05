import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import propertyRoutes from './routes/propertyRoutes';
import tenantRoutes from './routes/tenantRoutes';
import statsRoutes from './routes/statsRoutes';
import waterReadingsRoutes from './routes/waterReadingsRoutes';
import paymentRoutes from './routes/paymentRoutes';
import expenseRoutes from './routes/expenseRoutes';
import billingRoutes from './routes/billingRoutes';
import tenantPaymentRoutes from './routes/tenantPaymentRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import reportsRoutes from './routes/reportsRoutes';
import usersRoutes from './routes/usersRoutes';
import authRoutes from './routes/authRoutes';

import './jobs/scheduler';

const app = express();

// ✅ Typed CORS config to allow GitHub Pages
const allowedOrigins = ['https://qenop.github.io'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('✅ ProSuite App API is running');
});

// 🟢 Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', waterReadingsRoutes);
app.use('/api/properties/:propertyId/payments', paymentRoutes);
app.use('/api/properties', expenseRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', tenantPaymentRoutes);
app.use('/api/properties', invoiceRoutes);
app.use('/api/reports', reportsRoutes);

// Log unmatched routes
app.use((req, res, next) => {
  console.log(`❌ Unmatched route: ${req.method} ${req.originalUrl}`);
  next();
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error('Not Found');
  res.status(404);
  next(error);
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ message: err.message || 'Internal Server Error' });
});

// Mongo + Server boot
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prosuite';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err: Error) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
