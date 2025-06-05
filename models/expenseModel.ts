// E:\PROJECTS\pro-suite-app\backend\models\expenseModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  propertyId: mongoose.Types.ObjectId;
  amount: number;
  description: string;
  date: Date;         // When the expense was incurred
  createdAt: Date;    // Auto-set by Mongoose
  updatedAt: Date;    // Auto-set by Mongoose
}

const expenseSchema = new Schema<IExpense>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);

export default Expense;
