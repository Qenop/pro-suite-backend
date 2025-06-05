// backend/controllers/billingController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Billing, { IBill } from '../models/billingModel';
import Property from '../models/propertyModel';
import Tenant from '../models/tenantModel';
import WaterReading from '../models/waterReadingsModel';
import Payment from '../models/paymentModel';
import Invoice from '../models/invoiceModel';

const findUnitDetails = (property: any, unitId: string) => {
  for (const unitGroup of property.units) {
    const matched = unitGroup.unitIds.find((u: any) => u.unitId.toString() === unitId.toString());
    if (matched) {
      return {
        unitType: unitGroup.type,
        rent: unitGroup.rent,
        deposit: unitGroup.deposit,
        status: matched.status,
      };
    }
  }
  return null;
};

// POST /api/billings/:propertyId/generate
export const generateBills = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { period } = req.body;

  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return res.status(400).json({ message: 'Billing period must be in YYYY-MM format' });
  }

  const [billingYearStr, billingMonthStr] = period.split('-');
  const billingYear = parseInt(billingYearStr, 10);
  const billingMonth = parseInt(billingMonthStr, 10) - 1;

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const tenants = await Tenant.find({ propertyId });
    const garbageFee = property.utilities?.garbage || 0;
    const waterRate = property.utilities?.waterRate || 0;
    const isMetered = property.utilities?.water === 'Metered';

    const readingDocs = await WaterReading.find({ propertyId })
      .sort({ readingDate: -1 })
      .limit(2)
      .lean();

    const paymentsByTenantUnit = await Payment.aggregate([
      { $match: { property: new mongoose.Types.ObjectId(propertyId), period } },
      {
        $group: {
          _id: { tenant: '$tenant', unit: '$unit' },
          totalPaid: { $sum: '$amount' },
        },
      },
    ]);

    const paymentsMap = new Map<string, number>();
    paymentsByTenantUnit.forEach((p) => {
      const key = `${p._id.tenant}_${p._id.unit}`;
      paymentsMap.set(key, p.totalPaid);
    });

    const bulkOps = [];

    for (const tenant of tenants) {
      const leaseDate = new Date(tenant.leaseStartDate);
      if (
        leaseDate.getFullYear() > billingYear ||
        (leaseDate.getFullYear() === billingYear && leaseDate.getMonth() > billingMonth)
      ) {
        continue;
      }

      const tenantId = tenant._id as mongoose.Types.ObjectId;
      const unitId = tenant.unitId.toString();
      const unitDetails = findUnitDetails(property, unitId);

      if (!unitDetails || unitDetails.status.toLowerCase() !== 'occupied') continue;

      const rent = unitDetails.rent;
      let waterPrev = 0;
      let waterCurr = 0;
      let waterConsumed = 0;
      let waterAmount = 0;

      if (isMetered) {
        const isFirstMonthOfLease =
          leaseDate.getFullYear() === billingYear &&
          leaseDate.getMonth() === billingMonth;

        const latestReading = readingDocs[0]?.readings.find(
          (r: any) => r.unitId.toString() === unitId
        );
        const previousReading = readingDocs[1]?.readings.find(
          (r: any) => r.unitId.toString() === unitId
        );

        waterCurr = latestReading?.readingValue ?? 0;

        if (isFirstMonthOfLease) {
          waterPrev = tenant.initialWaterReading ?? 0;
        } else {
          waterPrev = previousReading?.readingValue ?? 0;
        }

        waterConsumed = Math.max(waterCurr - waterPrev, 0);
        waterAmount = waterConsumed * waterRate;
      }

      // Get prior bill to carry over balance/overpayment
      const previousPeriod = new Date(billingYear, billingMonth - 1, 1);
      const prevPeriodStr = `${previousPeriod.getFullYear()}-${String(previousPeriod.getMonth() + 1).padStart(2, '0')}`;

      const priorBill = await Billing.findOne({
        tenantId,
        unitId,
        propertyId,
        period: prevPeriodStr,
      });

      const priorCharges = (priorBill?.rent ?? 0) + (priorBill?.garbageFee ?? 0) + (priorBill?.water?.amount ?? 0);
      const carriedBalance = priorBill?.balance ?? 0;
      const carriedOverpayment = priorBill?.overpayment ?? 0;
      const netCarryOver = carriedBalance - carriedOverpayment;


      const totalDue = rent + garbageFee + waterAmount + netCarryOver;
      const paymentKey = `${tenantId}_${unitId}`;
      const paymentsReceived = paymentsMap.get(paymentKey) ?? 0;

      let balance = 0;
      let overpayment = 0;

      if (paymentsReceived >= totalDue) {
        overpayment = paymentsReceived - totalDue;
        balance = 0;
      } else {
        balance = totalDue - paymentsReceived;
        overpayment = 0;
      }
      // INSERT INVOICE SYNC LOGIC HERE
      const invoice = await Invoice.findOne({ tenantId, unitId, period });

      if (invoice) {
        invoice.amountPaid = paymentsReceived;

        if (paymentsReceived >= invoice.totalDue) {
          invoice.status = 'Paid';
        } else if (paymentsReceived > 0) {
          invoice.status = 'Partially Paid';
        } else {
          // Check if overdue based on dueDate or period
          const now = new Date();
          const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;

          if (dueDate && now > dueDate) {
            invoice.status = 'Overdue';
          } else {
            invoice.status = 'Unpaid';
          }
        }

        await invoice.save();
      }

      const filter = {
        propertyId: new mongoose.Types.ObjectId(propertyId),
        tenantId,
        unitId,
        period,
      };

      const update: Partial<IBill> = {
        propertyId: new mongoose.Types.ObjectId(propertyId),
        tenantId,
        unitId,
        period,
        rent,
        garbageFee,
        water: {
          prevReading: waterPrev,
          currentReading: waterCurr,
          consumed: waterConsumed,
          rate: waterRate,
          amount: waterAmount,
        },
        totalDue,
        paymentsReceived,
        balance,
        overpayment,
        carriedBalance,
        carriedOverpayment,
        createdAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: update },
          upsert: true,
        },
      });
    }

    if (bulkOps.length === 0) {
      return res.status(200).json({ message: 'No bills to generate for the given period.' });
    }

    const result = await Billing.bulkWrite(bulkOps);

    res.status(201).json({
      message: `${result.upsertedCount + result.modifiedCount} bills generated/updated successfully.`,
    });
  } catch (error: any) {
    console.error('Billing generation error:', error);
    res.status(500).json({ message: 'Server error generating bills' });
  }
};

// GET /api/billings/:propertyId?period=YYYY-MM
export const getBillsForProperty = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const period = req.query.period as string;

  if (!period) {
    return res.status(400).json({ message: 'Billing period is required' });
  }

  try {
    const bills = await Billing.find({ propertyId, period })
      .populate('tenantId', 'name phone')
      .lean();

    res.status(200).json({ bills });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Server error fetching bills' });
  }
};

// GET /api/billings/tenant/:tenantId
export const getBillsForTenant = async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
    const bills = await Billing.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(bills);
  } catch (error: any) {
    console.error('Error fetching tenant bills:', error);
    res.status(500).json({ message: 'Server error fetching tenant bills' });
  }
};

