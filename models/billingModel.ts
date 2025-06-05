// E:\PROJECTS\pro-suite-app\backend\models\billingModel.ts
import mongoose, { Schema, Document } from 'mongoose';

interface WaterBill {
  prevReading: number;
  currentReading: number;
  consumed: number;
  rate: number;
  amount: number;
}

interface OtherCharge {
  label: string;
  amount: number;
}

export interface IBill extends Document {
  _id: mongoose.Types.ObjectId; // ✅ Explicitly added
  tenantId: mongoose.Types.ObjectId;
  unitId: string;
  propertyId: mongoose.Types.ObjectId;
  period: string; // format: "YYYY-MM", e.g. "2025-05"
  rent: number;
  garbageFee: number;
  water: WaterBill;
  otherCharges?: OtherCharge[];
  totalDue: number;
  paymentsReceived: number;
  balance: number;
  overpayment: number;
  carriedBalance?: number;
  carriedOverpayment?: number;
  payments: mongoose.Types.ObjectId[];
  status: 'Unpaid' | 'Paid' | 'Partially Paid' | 'Overpaid';
  createdAt: Date;
  updatedAt: Date;
}

const WaterBillSchema: Schema = new Schema({
  prevReading: { type: Number, required: true },
  currentReading: { type: Number, required: true },
  consumed: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const OtherChargeSchema: Schema = new Schema({
  label: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const BillingSchema: Schema = new Schema<IBill>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  unitId: { type: String, required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  period: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid billing period! Expected format YYYY-MM.`
    }
  },
  rent: { type: Number, required: true },
  garbageFee: { type: Number, required: true },
  water: { type: WaterBillSchema, required: true },
  otherCharges: { type: [OtherChargeSchema], default: [] },
  totalDue: { type: Number, required: true },
  paymentsReceived: { type: Number, required: true, default: 0 },
  balance: { type: Number, required: true },
  overpayment: { type: Number, required: true },
  carriedBalance: { type: Number, default: 0 },
  carriedOverpayment: { type: Number, default: 0 },
  payments: {
    type: [Schema.Types.ObjectId],
    ref: 'Payment',
    default: []
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Partially Paid', 'Overpaid'],
    required: true
  }
}, { timestamps: true });

BillingSchema.index(
  { tenantId: 1, unitId: 1, propertyId: 1, period: 1 },
  { unique: true }
);

export default mongoose.model<IBill>('Bill', BillingSchema);
