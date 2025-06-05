// E:\PROJECTS\pro-suite-app\backend\jobs\scheduler.ts
import cron from 'node-cron';
import Invoice from '../models/invoiceModel';
import Bill from '../models/billingModel'; // <-- import the Bill model

// Runs every Hour
cron.schedule('0 * * * *', async () => {
  console.log('Running invoice status check every hour...');

  const invoices = await Invoice.find({
    status: { $in: ['Unpaid', 'Partially Paid', 'Overdue'] }
    // Removed dueDate filter to allow updating invoices even before due date
  });

  for (const invoice of invoices) {
    const bill = await Bill.findById(invoice.bill);
    if (!bill) {
      console.warn(`⚠️ No bill found for invoice ${invoice._id}`);
      continue;
    }

    const { paymentsReceived, totalDue } = bill;

    if (paymentsReceived >= totalDue) {
      invoice.status = 'Paid';
    } else if (paymentsReceived > 0) {
      invoice.status = 'Partially Paid';
    } else if (invoice.dueDate < new Date()) {
      invoice.status = 'Overdue';
    } else {
      invoice.status = 'Unpaid';
    }

    // Keep amountPaid synced with the bill's paymentsReceived
    invoice.amountPaid = paymentsReceived;

    await invoice.save();
  }

  console.log(`✅ Checked and updated ${invoices.length} invoices`);
});
