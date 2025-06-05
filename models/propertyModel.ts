//E:\PROJECTS\pro-suite-app\backend\models\propertyModel.ts
import mongoose, { Document, Schema } from 'mongoose';
// Define TypeScript interfaces
interface PaymentDetails {
  accountName: string;
  accountNumber: string;
  bank: string;
  deadline: number;
}

interface Landlord {
  name: string;
  phone: string;
  email: string;
}

interface Utilities {
  water: string;
  waterRate: number;
  garbage: number;
}

interface UnitItem {
  unitId: string;
  status: 'vacant' | 'occupied';
  tenant: mongoose.Schema.Types.ObjectId; // Added tenant reference
}

interface UnitType {
  type: string;
  rent: number;
  deposit: number;
  count: number;
  unitIds: UnitItem[];
}

interface ServiceRate {
  model: 'Percent' | 'Fixed';
  value: number;
}

export interface IProperty extends Document {
  propertyName: string;
  address: string;
  propertyType: string;
  serviceRate: ServiceRate;
  paymentDetails: PaymentDetails;
  landlord: Landlord;
  utilities: Utilities;
  units: UnitType[];
}

// Schema definitions
const unitItemSchema = new Schema<UnitItem>({
  unitId: { type: String, required: true },
  status: {
    type: String,
    enum: ['vacant', 'occupied'],
    default: 'vacant',
  },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null }, // Tenant reference
});

const unitTypeSchema = new Schema<UnitType>({
  type: { type: String, required: true },
  rent: { type: Number, required: true },
  deposit: { type: Number, required: true },
  count: { type: Number, required: true },
  unitIds: [unitItemSchema],
});

const propertySchema = new Schema<IProperty>(
  {
    propertyName: { type: String, required: [true, 'Property name is required'] },
    address: { type: String, required: [true, 'Address is required'] },
    propertyType: { type: String, required: [true, 'Property type is required'] },

    serviceRate: {
      model: {
        type: String,
        enum: ['Percent', 'Fixed'],
        required: [true, 'Service rate model is required'],
      },
      value: {
        type: Number,
        required: [true, 'Service rate value is required'],
        min: 0,
      },
    },

    paymentDetails: {
      accountName: { type: String, required: [true, 'Account name is required'] },
      accountNumber: { type: String, required: [true, 'Account number is required'] },
      bank: { type: String, required: [true, 'Bank is required'] },
      deadline: { type: Number, required: [true, 'Payment deadline is required'], default: 5 },
    },

    landlord: {
      name: { type: String, required: [true, 'Landlord name is required'] },
      phone: { type: String, required: [true, 'Landlord phone is required'] },
      email: {
        type: String,
        required: [true, 'Landlord email is required'],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
      },
    },

    utilities: {
      water: { type: String, required: [true, 'Water billing method is required'] },
      waterRate: { type: Number, required: [true, 'Water rate is required'] },
      garbage: { type: Number, required: [true, 'Garbage fee is required'] },
    },

    units: [unitTypeSchema],
  },
  { timestamps: true }
);

const Property = mongoose.model<IProperty>('Property', propertySchema);

export default Property;
