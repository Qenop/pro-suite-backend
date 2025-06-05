// backend/controllers/invoiceController.ts
import { Request, Response, NextFunction } from 'express';
import Invoice from '../models/invoiceModel';
import { IInvoice } from '../models/invoiceModel';
import Bill, { IBill } from '../models/billingModel';
import { generateInvoicePdfBuffer } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import Property, {IProperty} from '../models/propertyModel';
import Tenant from '../models/tenantModel';

interface TenantInfo {
  name: string;
  email: string;
  phone: string;
}

// Helper to generate invoice number
function generateInvoiceNumber(billId: string): string {
  const timestamp = Date.now();
  const uniquePart = billId.toString().slice(-5);
  return `INV-${timestamp}-${uniquePart}`;
}

// Helper: Auto-update invoice status based on payments and due date 
async function autoUpdateInvoiceStatus(invoice: any): Promise<void> {
  const now = new Date();

  if (invoice.status === 'Paid' || invoice.status === 'Cancelled') {
    return;
  }

  if (invoice.amountPaid >= invoice.totalDue) {
    invoice.status = 'Paid';
  } else if (invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalDue) {
    invoice.status = 'Partially Paid';
  } else if (invoice.dueDate && now > new Date(invoice.dueDate)) {
    invoice.status = 'Overdue';
  } else {
    invoice.status = 'Unpaid';
  }
//console.log('Saving invoice...');
  await invoice.save();
}

// Build line items from bill data
function buildLineItemsFromBill(bill: IBill) {
  const items = [];

  items.push({ label: 'Rent', amount: bill.rent });

  if (bill.water?.amount > 0) {
    items.push({
      label: 'Water',
      amount: bill.water.amount,
      detail: `Prev: ${bill.water.prevReading}, Curr: ${bill.water.currentReading}, Consumed: ${bill.water.consumed}, Rate: ${bill.water.rate}`,
    });
  }

  if (bill.garbageFee > 0) {
    items.push({ label: 'Garbage', amount: bill.garbageFee });
  }

  if (bill.otherCharges?.length) {
    bill.otherCharges.forEach((charge) => {
      items.push({ label: `Other: ${charge.label}`, amount: charge.amount });
    });
  }

  if (bill.carriedBalance && bill.carriedBalance !== 0) {
    items.push({ label: 'Carried Forward Balance', amount: bill.carriedBalance });
  }

  if (bill.carriedOverpayment && bill.carriedOverpayment > 0) {
    items.push({ label: 'Carried Overpayment', amount: -bill.carriedOverpayment });
  }

  return items;
}

// Bulk create invoices by period for a property
export const createInvoicesByPeriod = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { period } = req.body;

    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      res.status(400).json({ message: 'Invalid or missing period. Format YYYY-MM expected.' });
      return;
    }

    const bills = await Bill.find({ propertyId, period });

    if (bills.length === 0) {
      res.status(404).json({ message: 'No bills found for this property and period' });
      return;
    }

    const createdInvoices = [];

    for (const bill of bills) {
      const exists = await Invoice.findOne({ billId: bill._id });
      if (exists) continue;

      const lineItems = buildLineItemsFromBill(bill);
      const totalDue = lineItems.reduce((sum, item) => sum + item.amount, 0);

      const invoice = new Invoice({
        invoiceNumber: generateInvoiceNumber(bill.id),
        propertyId: bill.propertyId,
        tenantId: bill.tenantId,
        unitId: bill.unitId,
        bill: bill._id,
        period: bill.period,
        issueDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        status: 'Unpaid',
        lineItems,
        totalDue,
        sent: { email: false, whatsapp: false },
      });

      await invoice.save();
      createdInvoices.push(invoice);
      await autoUpdateInvoiceStatus(invoice);

    }

    if (createdInvoices.length === 0) {
      res.status(200).json({ message: 'Invoices already exist for all bills in this period.' });
      return;
    }

    res.status(201).json(createdInvoices);
  } catch (error) {
    console.error('Error creating invoices by period:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get invoices for a specific property with tenant name populated
export const getInvoicesByProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const invoices = await Invoice.find({ propertyId })
      .sort({ createdAt: -1 })
      .populate('tenantId', 'name');

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update invoice status (e.g., mark paid, cancel)
const allowedStatuses = ['Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];

export const updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const now = new Date();

    // Manual override: if a valid status is provided, use it
    if (status) {
      if (!allowedStatuses.includes(status)) {
        res.status(400).json({ message: 'Invalid status value' });
        return;
      }
      invoice.status = status;
    } else {
      // Auto-update to Overdue only if no manual override
      if (
        invoice.dueDate < now &&
        (invoice.status === 'Unpaid' || invoice.status === 'Partially Paid')
      ) {
        invoice.status = 'Overdue';
      }
    }

    await invoice.save();

    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an invoice for a property
export const deleteInvoice = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { id, propertyId } = req.params;

    const invoice = await Invoice.findOneAndDelete({ _id: id, propertyId });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found for this property' });
      return;
    }

    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sending Email function
export const sendInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, propertyId } = req.params;
    const { method, subject, message } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, propertyId }).populate('tenantId', 'name email phone');
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    const property = await Property.findById(propertyId).lean(); // Fetch the property
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const propertyName = property.propertyName;

    if (method === 'email') {
      const tenant = invoice.tenantId as unknown as TenantInfo;
      const recipientEmail = tenant.email;

      if (!recipientEmail) {
        res.status(400).json({ message: 'Tenant email not found' });
        return;
      }

      const invoiceWithTenantName = invoice.toObject() as unknown as IInvoice & { 
        tenantName: string
        propertyName: string;
         paymentDetails: {
          accountName?: string;
          accountNumber?: string;
          bank?: string;
          deadline?: number;
         };
      };
      invoiceWithTenantName.tenantName = tenant.name;
      invoiceWithTenantName.propertyName = property.propertyName;
      invoiceWithTenantName.paymentDetails = property.paymentDetails;


      const invoicePdfBuffer = await generateInvoicePdfBuffer(invoiceWithTenantName);

      await sendEmail({
        to: recipientEmail,
        from: `${propertyName} <info@propertyman.com>`, 
        subject: subject || `Invoice ${invoice.invoiceNumber}`,
        text: message || `Please find your invoice attached.`,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: invoicePdfBuffer,
          },
        ],
      });

      invoice.sent.email = true;
      invoice.sent.sentAt = new Date();
      await invoice.save();

      res.status(200).json({ message: 'Invoice sent via email', invoice });
    } else {
      res.status(400).json({ message: 'Invalid send method. Only "email" is supported.' });
    }
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ message: 'Failed to send invoice' });
  }
};

// ✅ NEW: Get invoices by tenant ID
export const getInvoicesByTenantId = async (req: Request, res: Response): Promise<void> => {
  const { tenantId } = req.params;

  try {
    const invoices = await Invoice.find({ tenantId })
      .sort({ createdAt: -1 })
      .populate('bill');
      //.populate('tenantId', 'name'); // only pull tenant name

    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices for tenant:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

