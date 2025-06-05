//E:\PROJECTS\pro-suite-app\backend\controllers\reportsController.ts
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Property from '../models/propertyModel';
import Tenant from '../models/tenantModel';
import Bill from '../models/billingModel';
import Expense from '../models/expenseModel';

// BALANCES REPORTS
export const getBalancesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId;

    const bills = await Bill.find({ propertyId })
      .populate({
        path: 'tenantId',
        model: Tenant,
        select: 'name unitId'
      })
      .select('balance tenantId period')

      .lean();

    const formattedReport = bills.map((bill) => {
      const tenant = bill.tenantId as {
        name?: string;
        unitId?: string;
      };

      return {
        tenant: tenant?.name || 'N/A',
        unit: tenant?.unitId || 'N/A',
        balance: bill.balance || 0,
        status:
          bill.balance > 0 ? 'Due' :
          bill.balance < 0 ? 'Overpaid' :
          'Settled',
          period: bill.period || 'N/A',
      };
    });

    res.status(200).json(formattedReport);
  } catch (error) {
    console.error('Error generating balances report:', error);
    res.status(500).json({ message: 'Failed to generate Balances report' });
  }
};

// OCCUPANCY REPORTS - Monthly Occupancy for last 6 months
export const getOccupancyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId;
    const monthsToAnalyze = 6;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ message: 'Invalid property ID' });
      return;
    }

    const property = await Property.findById(propertyId).select('units');

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Flatten unitIds from all unit groups (e.g. Studio, 1BR) to an array of strings
    const allUnitIds: string[] = property.units.flatMap(unit =>
      unit.unitIds.map((u: { unitId: string }) => u.unitId)
    );

    const totalUnits = allUnitIds.length;

    const today = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];

    // Prepare last N months date ranges (start/end)
    for (let i = 0; i < monthsToAnalyze; i++) {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);

      months.unshift({
        label: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' }),
        start: firstDay,
        end: lastDay,
      });
    }

    const result = [];

    for (const month of months) {
      const occupiedUnitsCount = await Tenant.countDocuments({
        propertyId,
        unitId: { $in: allUnitIds },
        leaseStartDate: { $lte: month.end },
        $or: [
          { leaseEndDate: { $gte: month.start } },
          { leaseEndDate: { $exists: false } },  // Treat missing leaseEndDate as active
        ],
      });

      const occupancyRate = totalUnits > 0 ? (occupiedUnitsCount / totalUnits) * 100 : 0;
      const vacancyRate = 100 - occupancyRate;

      result.push({
        month: month.label,
        occupancy: occupancyRate.toFixed(2),
        vacancy: vacancyRate.toFixed(2),
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({ message: 'Error generating occupancy report' });
  }
};

// UTILITY REPORTS (Water consumption etc.)
export const getUtilityReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ message: 'Invalid property ID' });
      return;
    }

    const propertyObjectId = new mongoose.Types.ObjectId(propertyId);

    // Aggregate utility usage grouped by tenant and unit
    const usageByTenantUnit = await Bill.aggregate([
      { $match: { propertyId: propertyObjectId } },

      {
        $group: {
          _id: {
            tenantId: '$tenantId',
            unitId: '$unitId',
          },
          totalWaterUsage: { $sum: '$water.consumed' },
          totalElectricityUsage: { $sum: '$electricity.consumed' },
        },
      },

      {
        $lookup: {
          from: 'tenants',
          localField: '_id.tenantId',
          foreignField: '_id',
          as: 'tenant',
        },
      },
      { $unwind: '$tenant' },

      {
        $project: {
          tenant: '$tenant.name',
          unit: '$_id.unitId',
          waterUsage: '$totalWaterUsage',
          electricityUsage: '$totalElectricityUsage',
        },
      },
    ]);

    // Aggregate total water and electricity usage for the property
    const totalUsage = await Bill.aggregate([
      { $match: { propertyId: propertyObjectId } },
      {
        $group: {
          _id: null,
          totalWaterUsage: { $sum: '$water.consumed' },
          totalElectricityUsage: { $sum: '$electricity.consumed' },
        },
      },
    ]);

    // Extract totals or fallback to zero
    const totalWaterUsage = totalUsage[0]?.totalWaterUsage || 0;
    const totalElectricityUsage = totalUsage[0]?.totalElectricityUsage || 0;

    res.status(200).json({
      usageByTenantUnit,
      totalUsage: {
        waterUsage: totalWaterUsage,
        electricityUsage: totalElectricityUsage,
      },
    });
  } catch (error) {
    console.error('Error generating utility report:', error);
    res.status(500).json({ message: 'Failed to generate utility report' });
  }
};

// BILLING STATS (Summary of bills, payments, overdue, etc.)
export const getBillingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId;
    const propertyObjectId = new mongoose.Types.ObjectId(propertyId);

    const billingStats = await Bill.aggregate([
      { $match: { propertyId: propertyObjectId } },
      {
        $group: {
          _id: '$period', // e.g., "2025-05"
          billedAmount: { $sum: '$totalDue' },
          paidAmount: { $sum: '$paymentsReceived' },
          outstandingAmount: { $sum: '$balance' },
          totalBills: { $sum: 1 },
          overdueBills: {
            $sum: {
              $cond: [{ $gt: ['$balance', 0] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { _id: 1 } // sort by period (YYYY-MM)
      }
    ]);

    const transformedStats = billingStats.map(item => ({
      month: item._id, // this is the "2025-05" period
      billedAmount: item.billedAmount,
      paidAmount: item.paidAmount,
      outstandingAmount: item.outstandingAmount,
      totalBills: item.totalBills,
      overdueBills: item.overdueBills,
    }));

    res.status(200).json(transformedStats);
  } catch (error) {
    console.error('Error generating billing stats:', error);
    res.status(500).json({ message: 'Failed to generate billing stats' });
  }
};

// FINANCIAL REPORTS (Income vs expenses summary, assuming expenses tracked elsewhere)
export const getFinancialReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId;
    const propertyObjectId = new mongoose.Types.ObjectId(propertyId);

    // 1. Rent billed per month
    const rentBilled = await Bill.aggregate([
      { $match: { propertyId: propertyObjectId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          rent: { $sum: '$rent' },
        },
      },
    ]);

    // 2. Payments received per month
    const payments = await Bill.aggregate([
      { $match: { propertyId: propertyObjectId } },
      { $unwind: '$payments' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          payments: { $sum: '$paymentsReceived' },
        },
      },
    ]);

    // 3. Expenses per month
    const expenses = await Expense.aggregate([
      { $match: { propertyId: propertyObjectId } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          expenses: { $sum: '$amount' },
        },
      },
    ]);

    // 4. Merge results into one structure by year-month
    const merged: Record<string, any> = {};

    const merge = (arr: any[], field: string) => {
      arr.forEach(({ _id, [field]: value }) => {
        const key = `${_id.year}-${_id.month.toString().padStart(2, '0')}`;
        if (!merged[key]) {
          merged[key] = {
            year: _id.year,
            month: _id.month,
            rent: 0,
            payments: 0,
            expenses: 0,
          };
        }
        merged[key][field] = value;
      });
    };

    merge(rentBilled, 'rent');
    merge(payments, 'payments');
    merge(expenses, 'expenses');

    // 5. Create final report and compute net income
    const financialReport = Object.values(merged).map((item) => ({
      year: item.year,
      month: item.month,
      rent: item.rent || 0,
      payments: item.payments || 0,
      expenses: item.expenses || 0,
      netIncome: (item.payments || 0) - (item.expenses || 0),
    }));

    // 6. Sort by date
    financialReport.sort((a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    });

    res.status(200).json(financialReport);
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ message: 'Failed to generate financial report' });
  }
};
