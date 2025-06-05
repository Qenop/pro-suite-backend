// backend/controllers/statsController.ts
import { Request, Response } from 'express';
import Property from '../models/propertyModel';
import Tenant from '../models/tenantModel';
import Expense from '../models/expenseModel';
import Payment from '../models/paymentModel';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalProperties = await Property.countDocuments();
    const totalTenants = await Tenant.countDocuments();
    const properties = await Property.find();

    let totalUnits = 0;
    let vacantUnits = 0;

    for (const property of properties) {
      if (!Array.isArray(property.units)) continue;

      for (const unitGroup of property.units) {
        if (!Array.isArray(unitGroup.unitIds)) continue;

        for (const unit of unitGroup.unitIds) {
          if (unit && unit.status) {
            totalUnits++;
            if (unit.status.toLowerCase() === 'vacant') vacantUnits++;
          }
        }
      }
    }

    // Occupancy rate
    const occupancyRate = totalUnits > 0
      ? (((totalUnits - vacantUnits) / totalUnits) * 100).toFixed(1)
      : "0.0";

    // Sum total expenses
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = expenseAgg[0]?.total || 0;

    // Sum total revenue
    const paymentAgg = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = paymentAgg[0]?.total || 0;

    res.status(200).json({
      totalProperties,
      totalTenants,
      totalUnits,
      vacantUnits,
      occupancyRate,
      totalExpense,
      totalRevenue,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Failed to fetch stats', error: err });
  }
};
