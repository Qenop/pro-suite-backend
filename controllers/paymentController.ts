//E:\PROJECTS\pro-suite-app\backend\controllers\paymentController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payment from '../models/paymentModel';
import Bill from '../models/billingModel'; // ✅ Import Bill model

// Record a new payment and update associated bill if type is Rent
export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  const { propertyId } = req.params;
  const { tenantId, unitId, amount, date, method, paymentReference, type } = req.body;

  console.log('Received payment:', req.body);

  try {
    // Enforce one-time deposit per tenant per unit
    if (type === 'Deposit') {
      const existingDeposit = await Payment.findOne({
        tenantId,
        unitId,
        type: 'Deposit',
      });

      if (existingDeposit) {
        res.status(400).json({
          error: 'A deposit payment has already been recorded for this tenant and unit.',
        });
        return;
      }
    }

    const paymentDate = new Date(date);
    const period = paymentDate.toISOString().slice(0, 7); // "YYYY-MM"

    // Step 1: Create the payment
    const payment = await Payment.create({
      property: propertyId,
      tenantId,
      unitId,
      amount,
      date: paymentDate,
      method,
      paymentReference,
      type,
      period,
    });

    // Step 2: If payment is Rent, update the corresponding bill
    if (type === 'Rent') {
      const bill = await Bill.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        unitId,
        propertyId: new mongoose.Types.ObjectId(propertyId),
        period,
      });

      if (bill) {
        bill.paymentsReceived += amount;
        bill.balance = bill.totalDue - bill.paymentsReceived;

        if (bill.balance < 0) {
          bill.overpayment = Math.abs(bill.balance);
          bill.status = 'Overpaid';
          bill.balance = 0;
        } else if (bill.balance === 0) {
          bill.status = 'Paid';
        } else {
          bill.status = 'Partially Paid';
        }

        if (!bill.payments) {
          bill.payments = [];
        }

        if (!bill.payments.includes(payment._id)) {
          bill.payments.push(payment._id);
        }

        await bill.save();
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error('Error saving payment:', err);
    res.status(500).json({ error: 'Failed to save payment' });
  }
};

// Get all payments for a specific property (with tenant name)
export const getPaymentsByProperty = async (req: Request, res: Response): Promise<void> => {
  const { propertyId } = req.params;

  try {
    const payments = await Payment.find({ property: propertyId })
      .populate('tenantId', 'name')
      .sort({ date: -1 });

    res.status(200).json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Get all payments for a specific tenant
export const getPaymentsByTenant = async (req: Request, res: Response): Promise<void> => {
  const { tenantId } = req.params;

  try {
    const payments = await Payment.find({ tenantId })
      .populate('property', 'name')
      .populate('unitId', 'unitId')
      .sort({ date: -1 });

    if (!payments || payments.length === 0) {
      res.status(404).json({ error: 'No payments found for this tenant.' });
      return;
    }

    res.status(200).json(payments);
  } catch (err) {
    console.error('Error fetching tenant payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments for tenant' });
  }
};

// Get deposit paid by tenant for a specific unit
export const getDepositPaymentByTenant = async (req: Request, res: Response): Promise<void> => {
  const { tenantId } = req.params;

  try {
    const deposit = await Payment.findOne({
      tenantId,
      type: 'Deposit',
    }).sort({ date: -1 }); // Get the most recent deposit if multiple (shouldn’t happen)

    if (!deposit) {
      res.status(404).json({ error: 'No deposit payment found for this tenant.' });
      return;
    }

    res.status(200).json(deposit);
  } catch (err) {
    console.error('Error fetching deposit:', err);
    res.status(500).json({ error: 'Failed to fetch deposit payment' });
  }
};

