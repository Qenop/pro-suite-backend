// E:\PROJECTS\pro-suite-app\backend\models\invoiceModel.ts
import mongoose, { Schema, Document } from 'mongoose';

interface LineItem {
  label: string;
  amount: number;
  detail?: string; // Optional descriptive breakdown (e.g., water reading details)
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  tenantId: mongoose.Types.ObjectId;
  unitId: string;
  propertyId: mongoose.Types.ObjectId;
  period: string; // Format: YYYY-MM
  issueDate: Date;
  dueDate: Date;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' |  'Cancelled';
  bill: mongoose.Types.ObjectId; // 1:1 link to bill
  lineItems: LineItem[];
  totalDue: number;
  amountPaid: number;
  sent: {
    email: boolean;
    whatsapp: boolean;
    sentAt?: Date;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<LineItem>(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    detail: { type: String }
  },
  { _id: false }
);
// Invoice schema
const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
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
        message: (props: any) => `${props.value} is not a valid period! Format should be YYYY-MM.`
      }
    },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      required: true,
      default: 'Unpaid'
    },
    bill: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      unique: true // Ensure 1:1 relationship
    },
    lineItems: {
      type: [LineItemSchema],
      required: true,
      validate: {
        validator: function (items: LineItem[]) {
          return items.length > 0;
        },
        message: 'At least one line item is required.'
      }
    },
    totalDue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },

    // NEW FIELDS BELOW
    sent: {
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      sentAt: { type: Date }
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

// Ensure only one invoice per tenant/unit/property/period
InvoiceSchema.index(
  { tenantId: 1, unitId: 1, propertyId: 1, period: 1 },
  { unique: true }
);

const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
export { IInvoice as InvoiceDocument }; // 👈 Add this line
