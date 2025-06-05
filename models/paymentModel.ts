// models/paymentModel.ts
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  unitId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ['mpesa', 'bank', 'cash'], required: true },
  paymentReference: { type: String },
  type: { type: String, enum: ['Rent', 'Deposit'], required: true },
  period: { type: String, required: true }, // Format: "YYYY-MM", for filtering by month
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
