//E:\PROJECTS\pro-suite-app\backend\models\tenantModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  propertyId: mongoose.Types.ObjectId;
  unitId: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  leaseStartDate: Date;
  rent: number;
  deposit: number;
  initialWaterReading?: number;

  profilePicture?: string;
  notes?: string;
  occupation?: string;
  gender?: 'Male' | 'Female' | 'Other';

  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

const tenantSchema = new Schema<ITenant>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unitId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    idNumber: { type: String, required: true },
    leaseStartDate: { type: Date, required: true },
    rent: { type: Number, required: true },
    deposit: { type: Number, required: true },
    initialWaterReading: { type: Number },

// Optional profile fields
    profilePicture: { type: String },
    notes: { type: String },
    occupation: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },

    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
  },
  { timestamps: true }
);

const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
export default Tenant;
