//E:\PROJECTS\pro-suite-app\backend\models\waterReadingsModel.ts
import mongoose, { Schema, Document } from "mongoose";

interface UnitReading {
  unitId: string;
  readingValue: number;
}

export interface IWaterReading extends Document {
  propertyId: string;
  readingDate: Date;
  readings: UnitReading[];
}

const UnitReadingSchema: Schema = new Schema({
  unitId: { type: String, required: true },
  readingValue: { type: Number, required: true, min: 0 },
});

const WaterReadingSchema: Schema = new Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    readingDate: { type: Date, required: true },
    readings: [UnitReadingSchema],
  },
  { timestamps: true }
);

// Index for efficient queries
WaterReadingSchema.index({ propertyId: 1, readingDate: -1 });

// Optional unique constraint to prevent duplicate readings for same property/date
WaterReadingSchema.index({ propertyId: 1, readingDate: 1 }, { unique: true });

const WaterReading = mongoose.model<IWaterReading>("WaterReading", WaterReadingSchema);

export default WaterReading;
